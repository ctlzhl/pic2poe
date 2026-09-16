const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

const normalizeExtension = (extension) => {
  if (!extension) {
    return ''
  }
  return String(extension).toLowerCase().replace(/^\./, '')
}

const getImageExtensionFromPath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return ''
  }
  const cleanPath = filePath.split('?')[0].split('#')[0]
  const match = cleanPath.match(/\.([a-z0-9]+)$/i)
  return match ? normalizeExtension(match[1]) : ''
}

module.exports = {
  ALLOWED_IMAGE_EXTENSIONS,
  getImageExtensionFromPath
}
