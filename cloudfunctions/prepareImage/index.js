const cloud = require('wx-server-sdk')
const sharp = require('sharp')
const { uploadWithCompensation } = require('./storage-core')
const { downloadAndDerive, matchesUploadTicket } = require('./input-core')
const { checkImage } = require('./security-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_BYTES = 6 * 1024 * 1024
const MAX_PIXELS = 64 * 1000 * 1000
// 创作与分享的最长边为 1440px；1600px 能保留余量，同时显著降低后续上传和模型读取成本。
const CREATION_MAX_EDGE = 1600
const THUMBNAIL_MAX_EDGE = 640
const ORIGINAL_TTL_MS = 24 * 60 * 60 * 1000
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])

const fail = (code, message) => ({ ok: false, code, message })

const toPublicMetadata = (metadata) => ({
  format: metadata.format,
  width: metadata.width,
  height: metadata.height,
  pages: metadata.pages || 1,
  hasAlpha: Boolean(metadata.hasAlpha),
  orientation: metadata.orientation || 1
})

const detectMagicType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return 'unknown'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return 'unknown'
}

const sourceExtension = (format) => (format === 'jpeg' ? 'jpg' : format)
const inputError = (code) => Object.assign(new Error(code), { code })

const inspectInput = async (input) => {
  if (!Buffer.isBuffer(input) || input.length === 0) throw inputError('EMPTY_FILE')
  if (input.length > MAX_BYTES) throw inputError('FILE_TOO_LARGE')
  if (!ALLOWED_FORMATS.has(detectMagicType(input))) throw inputError('UNSUPPORTED_IMAGE')
  let metadata
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata()
  } catch (error) {
    throw inputError('INVALID_IMAGE')
  }
  if (!ALLOWED_FORMATS.has(metadata.format)) throw inputError('UNSUPPORTED_IMAGE')
  if (!metadata.width || !metadata.height) throw inputError('INVALID_IMAGE')
  if (metadata.width * metadata.height > MAX_PIXELS) throw inputError('INVALID_IMAGE')
  return metadata
}

const imageAspect = (metadata) => {
  const sideways = [5, 6, 7, 8].includes(metadata.orientation || 1)
  return sideways ? metadata.height / metadata.width : metadata.width / metadata.height
}

const markAssetFailed = async (assetId, code) => {
  try {
    await db.collection('imageAssets').doc(assetId).update({
      data: {
        status: 'failed',
        errorCode: code,
        updatedAt: db.serverDate()
      }
    })
  } catch (error) {
    console.warn('标记失败图片资产失败:', error && error.message ? error.message : String(error))
  }
}

const bestEffortDeleteFiles = async (fileIDs) => {
  const fileList = [...new Set((fileIDs || []).filter(Boolean))]
  if (fileList.length === 0) return
  try {
    await cloud.deleteFile({ fileList })
  } catch (error) {
    console.warn('图片文件清理失败:', error && error.message ? error.message : String(error))
  }
}

const buildDerivedImages = async (input) => {
  const base = sharp(input, { limitInputPixels: MAX_PIXELS, pages: 1 })
    .rotate()
    .toColorspace('srgb')
    .flatten({ background: '#ffffff' })

  const creationBuffer = await base
    .clone()
    .resize({
      width: CREATION_MAX_EDGE,
      height: CREATION_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer()

  // 缩略图从已生成的创作图继续缩放，避免再次解码高像素原图。
  const thumbnailBuffer = await sharp(creationBuffer)
    .resize({
      width: THUMBNAIL_MAX_EDGE,
      height: THUMBNAIL_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer()

  return { creationBuffer, thumbnailBuffer }
}

const buildSafetyThumbnail = (input) => sharp(input, { limitInputPixels: MAX_PIXELS, pages: 1 })
  .rotate()
  .toColorspace('srgb')
  .flatten({ background: '#ffffff' })
  .resize({
    width: THUMBNAIL_MAX_EDGE,
    height: THUMBNAIL_MAX_EDGE,
    fit: 'inside',
    withoutEnlargement: true
  })
  .jpeg({ quality: 75 })
  .toBuffer()

exports.main = async (event = {}) => {
  const startedAt = Date.now()
  let stageStartedAt = startedAt
  const stagesMs = {}
  const finishStage = (name) => {
    const now = Date.now()
    stagesMs[name] = now - stageStartedAt
    stageStartedAt = now
  }
  const fileID = typeof event.fileID === 'string' ? event.fileID : ''
  const workingFileID = typeof event.workingFileID === 'string' ? event.workingFileID : ''
  const assetId = typeof event.assetId === 'string' ? event.assetId : ''
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) return fail('UNAUTHORIZED', '请先登录后再上传图片。')
  if (!assetId) return fail('INVALID_ASSET', '图片上传任务无效，请重新选择。')
  if (!fileID.startsWith('cloud://')) return fail('INVALID_FILE', '图片上传信息无效，请重新选择。')
  if (workingFileID && !workingFileID.startsWith('cloud://')) return fail('INVALID_FILE', '工作图片上传信息无效，请重新选择。')

  let uploadAsset
  try {
    uploadAsset = await db.runTransaction(async (transaction) => {
      const result = await transaction.collection('imageAssets').doc(assetId).get()
      const asset = result.data
      if (!asset || asset.userId !== openid || asset.status !== 'uploading') return null
      if (!matchesUploadTicket(asset, fileID, workingFileID)) return null
      await transaction.collection('imageAssets').doc(assetId).update({
        data: {
          status: 'processing',
          stagingFileId: fileID,
          workingStagingFileId: workingFileID,
          updatedAt: db.serverDate()
        }
      })
      return asset
    })
  } catch (error) {
    console.error('领取图片上传任务失败:', error)
    return fail('PREPARE_FAILED', '图片处理失败，请稍后重试。')
  }
  if (!uploadAsset) return fail('INVALID_ASSET', '图片上传任务无效或已处理，请重新选择。')
  finishStage('claimMs')

  let input
  let metadata
  let derived
  try {
    const result = await downloadAndDerive({
      originalFileID: fileID,
      workingFileID,
      downloadFile: async (downloadFileID) => {
        try {
          return (await cloud.downloadFile({ fileID: downloadFileID })).fileContent
        } catch (error) {
          throw inputError('DOWNLOAD_FAILED')
        }
      },
      derive: async (workingInput) => {
        const workingMetadata = await inspectInput(workingInput)
        if (workingFileID && Math.max(workingMetadata.width, workingMetadata.height) > 2064) {
          throw inputError('INVALID_IMAGE')
        }
        return { metadata: workingMetadata, images: await buildDerivedImages(workingInput) }
      }
    })
    input = result.originalBuffer
    metadata = await inspectInput(input)
    if (workingFileID && Math.abs(imageAspect(metadata) / imageAspect(result.derived.metadata) - 1) > 0.03) {
      throw inputError('INVALID_IMAGE')
    }
    derived = result.derived.images
    stagesMs.downloadMs = result.timings.originalDownloadMs
    stagesMs.workingDownloadMs = result.timings.workingDownloadMs
    stagesMs.deriveMs = result.timings.deriveMs
    stagesMs.inputWallMs = result.timings.inputWallMs
    stageStartedAt = Date.now()
  } catch (error) {
    const code = ['DOWNLOAD_FAILED', 'EMPTY_FILE', 'FILE_TOO_LARGE', 'UNSUPPORTED_IMAGE', 'INVALID_IMAGE'].includes(error?.code)
      ? error.code : 'INVALID_IMAGE'
    console.warn('图片下载或派生失败:', code, error?.message || String(error))
    await markAssetFailed(assetId, code)
    await bestEffortDeleteFiles([fileID, workingFileID])
    const messages = {
      DOWNLOAD_FAILED: '图片上传未完成，请重新选择。',
      EMPTY_FILE: '图片文件为空，请重新选择。',
      FILE_TOO_LARGE: '图片不能超过 6MB，请重新选择。',
      UNSUPPORTED_IMAGE: '暂不支持这种图片格式，请选择 JPG、PNG 或 WebP。',
      INVALID_IMAGE: '图片无法读取，请重新选择。'
    }
    return fail(code, messages[code])
  }
  const inputBytes = input.length

  try {
    await checkImage(cloud, derived.thumbnailBuffer)
    // 工作图与原图来自两次独立上传，不能仅凭尺寸比例认定内容一致。
    if (workingFileID) await checkImage(cloud, await buildSafetyThumbnail(input))
    finishStage('securityMs')
  } catch (error) {
    const rejected = error?.message === 'CONTENT_REJECTED'
    await markAssetFailed(assetId, rejected ? 'CONTENT_REJECTED' : 'CONTENT_CHECK_UNAVAILABLE')
    await bestEffortDeleteFiles([fileID, workingFileID])
    return rejected
      ? fail('CONTENT_REJECTED', '图片内容含违规信息，请更换后重试。')
      : fail('CONTENT_CHECK_UNAVAILABLE', '图片内容校验暂不可用，请稍后重试。')
  }

  const originalPath = `original/${openid}/${assetId}.${sourceExtension(metadata.format)}`
  const creationPath = `users/${openid}/creation/${assetId}.jpg`
  const thumbnailPath = `users/${openid}/thumbnail/${assetId}.jpg`

  try {
    const [original, creation, thumbnail] = await uploadWithCompensation({
      uploads: [
        { cloudPath: originalPath, fileContent: input },
        { cloudPath: creationPath, fileContent: derived.creationBuffer },
        { cloudPath: thumbnailPath, fileContent: derived.thumbnailBuffer }
      ],
      uploadFile: (options) => cloud.uploadFile(options),
      cleanupFileIds: bestEffortDeleteFiles,
      afterUpload: async ([uploadedOriginal, uploadedCreation, uploadedThumbnail]) => {
        await db.collection('imageAssets').doc(assetId).update({
          data: {
            status: 'ready',
            originalFileId: uploadedOriginal.fileID,
            creationFileId: uploadedCreation.fileID,
            thumbnailFileId: uploadedThumbnail.fileID,
            sourceFormat: metadata.format,
            inputBytes,
            creationBytes: Buffer.byteLength(derived.creationBuffer),
            thumbnailBytes: Buffer.byteLength(derived.thumbnailBuffer),
            metadata: toPublicMetadata(metadata),
            safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() },
            stagingFileId: '',
            workingStagingFileId: '',
            errorCode: '',
            readyAt: db.serverDate(),
            updatedAt: db.serverDate(),
            expiresAt: new Date(Date.now() + ORIGINAL_TTL_MS)
          }
        })
      }
    })
    finishStage('saveMs')

    await bestEffortDeleteFiles([fileID, workingFileID])
    finishStage('cleanupMs')
    console.info('[prepareImageTiming]', { ...stagesMs, totalMs: Date.now() - startedAt, inputBytes })

    return {
      ok: true,
      data: {
        assetId,
        status: 'ready',
        metadata: toPublicMetadata(metadata),
        inputBytes,
        thumbnailFileId: thumbnail.fileID
      }
    }
  } catch (error) {
    console.error('保存图片资产失败:', error)
    await markAssetFailed(assetId, 'PREPARE_FAILED')
    return fail('PREPARE_FAILED', '图片处理失败，请稍后重试。')
  }
}
