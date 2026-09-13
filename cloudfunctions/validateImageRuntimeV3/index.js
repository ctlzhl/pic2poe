const MAX_BYTES = 6 * 1024 * 1024

const loadDependencies = () => {
  const cloud = require('wx-server-sdk')
  const sharp = require('sharp')
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
  return { cloud, sharp }
}

const publicMetadata = (metadata) => ({
  format: metadata.format,
  width: metadata.width,
  height: metadata.height,
  pages: metadata.pages,
  hasAlpha: metadata.hasAlpha,
  orientation: metadata.orientation
})

const supportedInputs = (sharp) => Object.entries(sharp.format).reduce((result, [name, capability]) => {
  result[name] = Boolean(capability && capability.input)
  return result
}, {})

const validateFile = async ({ cloud, sharp, fileID, index, requestId, keepDerived }) => {
  const startedAt = Date.now()

  try {
    const downloadResult = await cloud.downloadFile({ fileID })
    const input = downloadResult.fileContent
    const size = Buffer.byteLength(input)

    if (size > MAX_BYTES) {
      return { index, fileID, ok: false, stage: 'size', message: '图片超过 6 MB 限制。', size }
    }

    const metadata = await sharp(input, { limitInputPixels: 64 * 1000 * 1000 }).metadata()
    const output = await sharp(input, { limitInputPixels: 64 * 1000 * 1000 })
      .rotate()
      .toColorspace('srgb')
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer()

    let outputFileID
    if (keepDerived) {
      const uploadResult = await cloud.uploadFile({
        cloudPath: `validation/v3/${requestId}/sample-${index}.jpg`,
        fileContent: output
      })
      outputFileID = uploadResult.fileID
    }

    return {
      index,
      fileID,
      ok: true,
      stage: 'done',
      input: publicMetadata(metadata),
      inputBytes: size,
      outputBytes: Buffer.byteLength(output),
      outputFileID,
      durationMs: Date.now() - startedAt
    }
  } catch (error) {
    return {
      index,
      fileID,
      ok: false,
      stage: 'decode_or_derive',
      message: error && error.message ? error.message : String(error),
      durationMs: Date.now() - startedAt
    }
  }
}

exports.main = async (event = {}) => {
  const fileIDs = Array.isArray(event.fileIDs) ? event.fileIDs : []
  const keepDerived = event.keepDerived !== false

  const baseRuntime = {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  }

  if (fileIDs.length === 0) {
    return { ok: true, message: 'Node.js 运行环境已正常加载；传入图片后才加载 Sharp。', runtime: baseRuntime }
  }

  const { cloud, sharp } = loadDependencies()
  const runtime = {
    ...baseRuntime,
    sharpVersions: sharp.versions,
    supportedInputs: supportedInputs(sharp)
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const results = []
  for (let index = 0; index < fileIDs.length; index += 1) {
    results.push(await validateFile({ cloud, sharp, fileID: fileIDs[index], index, requestId, keepDerived }))
  }

  return {
    ok: results.every(item => item.ok),
    requestId,
    runtime,
    summary: { total: results.length, passed: results.filter(item => item.ok).length },
    results
  }
}
