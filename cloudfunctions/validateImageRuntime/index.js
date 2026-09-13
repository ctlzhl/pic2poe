const cloud = require('wx-server-sdk')
const sharp = require('sharp')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const MAX_BYTES = 6 * 1024 * 1024
const MAX_PIXELS = 64 * 1000 * 1000
const CREATION_MAX_EDGE = 2048
const THUMB_MAX_EDGE = 640
const ALLOWED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'heif'])

const getMagicType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return 'unknown'

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp'

  const brand = buffer.slice(4, 12).toString('ascii')
  if (/^ftyp(heic|heix|hevc|hevx|mif1|msf1)/.test(brand)) return 'heif'

  return 'unknown'
}

const toPublicMetadata = (metadata) => ({
  format: metadata.format,
  width: metadata.width,
  height: metadata.height,
  space: metadata.space,
  channels: metadata.channels,
  depth: metadata.depth,
  density: metadata.density,
  hasAlpha: metadata.hasAlpha,
  orientation: metadata.orientation,
  pages: metadata.pages,
  pageHeight: metadata.pageHeight
})

const collectSupportedInputs = () => {
  return Object.entries(sharp.format).reduce((acc, [name, capability]) => {
    acc[name] = Boolean(capability && capability.input)
    return acc
  }, {})
}

const uploadBuffer = async ({ buffer, requestId, openid, index, suffix }) => {
  const owner = openid || 'console'
  const cloudPath = `validation/${owner}/${requestId}/sample-${index}-${suffix}.jpg`
  const result = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer
  })
  return result.fileID
}

const deriveImages = async (inputBuffer) => {
  const base = sharp(inputBuffer, {
    limitInputPixels: MAX_PIXELS
  }).rotate().toColorspace('srgb')

  const creationBuffer = await base
    .clone()
    .resize({
      width: CREATION_MAX_EDGE,
      height: CREATION_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 86,
      mozjpeg: true
    })
    .toBuffer()

  const thumbnailBuffer = await base
    .clone()
    .resize({
      width: THUMB_MAX_EDGE,
      height: THUMB_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 82,
      mozjpeg: true
    })
    .toBuffer()

  return {
    creationBuffer,
    thumbnailBuffer
  }
}

const validateOneFile = async ({ fileID, index, requestId, openid, keepDerived }) => {
  const startedAt = Date.now()

  try {
    const downloadResult = await cloud.downloadFile({ fileID })
    const inputBuffer = downloadResult.fileContent
    const size = Buffer.byteLength(inputBuffer)
    const magicType = getMagicType(inputBuffer)

    if (size > MAX_BYTES) {
      return {
        index,
        fileID,
        ok: false,
        stage: 'size',
        size,
        magicType,
        errorCode: 'FILE_TOO_LARGE',
        message: 'File is larger than the MVP 6 MB limit.'
      }
    }

    const metadata = await sharp(inputBuffer, {
      limitInputPixels: MAX_PIXELS
    }).metadata()

    const format = metadata.format
    if (!ALLOWED_FORMATS.has(format)) {
      return {
        index,
        fileID,
        ok: false,
        stage: 'format',
        size,
        magicType,
        metadata: toPublicMetadata(metadata),
        errorCode: 'UNSUPPORTED_FORMAT',
        message: `Decoded format "${format}" is not in the MVP allowlist.`
      }
    }

    const derived = await deriveImages(inputBuffer)
    const outputMetadata = {
      creation: toPublicMetadata(await sharp(derived.creationBuffer).metadata()),
      thumbnail: toPublicMetadata(await sharp(derived.thumbnailBuffer).metadata())
    }

    const outputFileIDs = keepDerived
      ? {
          creationFileID: await uploadBuffer({
            buffer: derived.creationBuffer,
            requestId,
            openid,
            index,
            suffix: 'creation'
          }),
          thumbnailFileID: await uploadBuffer({
            buffer: derived.thumbnailBuffer,
            requestId,
            openid,
            index,
            suffix: 'thumbnail'
          })
        }
      : {}

    return {
      index,
      fileID,
      ok: true,
      stage: 'done',
      size,
      magicType,
      input: toPublicMetadata(metadata),
      output: outputMetadata,
      outputBytes: {
        creation: Buffer.byteLength(derived.creationBuffer),
        thumbnail: Buffer.byteLength(derived.thumbnailBuffer)
      },
      outputFileIDs,
      durationMs: Date.now() - startedAt
    }
  } catch (error) {
    return {
      index,
      fileID,
      ok: false,
      stage: 'decode_or_derive',
      errorCode: 'IMAGE_PROCESSING_FAILED',
      message: error && error.message ? error.message : String(error),
      durationMs: Date.now() - startedAt
    }
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const fileIDs = Array.isArray(event.fileIDs)
    ? event.fileIDs
    : Array.isArray(event.fileIds)
      ? event.fileIds
      : []

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const keepDerived = event.keepDerived !== false

  if (fileIDs.length === 0) {
    return {
      ok: true,
      requestId,
      message: 'Pass { "fileIDs": ["cloud://..."], "keepDerived": true } to validate real image files.',
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        sharpVersions: sharp.versions,
        supportedInputs: collectSupportedInputs()
      }
    }
  }

  const results = []
  for (let index = 0; index < fileIDs.length; index += 1) {
    results.push(await validateOneFile({
      fileID: fileIDs[index],
      index,
      requestId,
      openid: wxContext.OPENID,
      keepDerived
    }))
  }

  return {
    ok: results.every(item => item.ok),
    requestId,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      sharpVersions: sharp.versions,
      supportedInputs: collectSupportedInputs()
    },
    summary: {
      total: results.length,
      passed: results.filter(item => item.ok).length,
      failed: results.filter(item => !item.ok).length
    },
    results
  }
}
