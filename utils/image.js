const DEFAULT_IMAGE_EXTENSION = 'jpg'
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

const resolveImageExtension = (filePath, preferredExtension) => {
  const normalizedPreferred = normalizeExtension(preferredExtension)
  if (normalizedPreferred && ALLOWED_IMAGE_EXTENSIONS.includes(normalizedPreferred)) {
    return normalizedPreferred
  }

  const extensionFromPath = getImageExtensionFromPath(filePath)
  if (extensionFromPath && ALLOWED_IMAGE_EXTENSIONS.includes(extensionFromPath)) {
    return extensionFromPath
  }

  return DEFAULT_IMAGE_EXTENSION
}

const buildImageCloudPath = (filePath, preferredExtension) => {
  const extension = resolveImageExtension(filePath, preferredExtension)
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  return `images/${Date.now()}-${randomSuffix}.${extension}`
}

module.exports = {
  DEFAULT_IMAGE_EXTENSION,
  ALLOWED_IMAGE_EXTENSIONS,
  getImageExtensionFromPath,
  resolveImageExtension,
  buildImageCloudPath
}
