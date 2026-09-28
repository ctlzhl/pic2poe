const MAX_EDGE = 2048
const MIN_SOURCE_BYTES = 1024 * 1024
const SIDEWAYS = new Set(['left', 'right', 'left-mirrored', 'right-mirrored'])

const callWx = (method, options) => new Promise((resolve, reject) => {
  wx[method]({ ...options, success: resolve, fail: reject })
})

const orientedSize = (info) => SIDEWAYS.has(info.orientation)
  ? { width: info.height, height: info.width }
  : { width: info.width, height: info.height }

const createWorkingImage = async (sourcePath, sourceBytes) => {
  if (!wx.compressImage || !wx.getFileInfo || sourceBytes < MIN_SOURCE_BYTES) return null
  try {
    const source = await callWx('getImageInfo', { src: sourcePath })
    const sourceSize = orientedSize(source)
    const maxSide = Math.max(sourceSize.width, sourceSize.height)
    if (!sourceSize.width || !sourceSize.height || maxSide <= MAX_EDGE) return null

    const ratio = MAX_EDGE / maxSide
    const result = await callWx('compressImage', {
      src: sourcePath,
      quality: 88,
      compressedWidth: Math.round(sourceSize.width * ratio),
      compressedHeight: Math.round(sourceSize.height * ratio)
    })
    if (!result.tempFilePath || result.tempFilePath === sourcePath) return null
    const [image, file] = await Promise.all([
      callWx('getImageInfo', { src: result.tempFilePath }),
      callWx('getFileInfo', { filePath: result.tempFilePath })
    ])
    const outputSize = orientedSize(image)
    const sourceAspect = sourceSize.width / sourceSize.height
    const outputAspect = outputSize.width / outputSize.height
    const extension = { jpeg: 'jpg', png: 'png', webp: 'webp' }[String(image.type).toLowerCase()]
    if (!extension || !file.size || file.size >= sourceBytes * 0.8) return null
    if (Math.max(outputSize.width, outputSize.height) > MAX_EDGE + 16) return null
    if (Math.abs(outputAspect / sourceAspect - 1) > 0.03) return null
    return { path: result.tempFilePath, extension, bytes: file.size }
  } catch (error) {
    return null
  }
}

module.exports = { createWorkingImage }
