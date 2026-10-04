const MAX_COVER_BYTES = 4 * 1024 * 1024
const ALLOWED_HOSTS = new Set(['shengxiluo.me', 'www.shengxiluo.me', 'i0.wp.com', 'i1.wp.com', 'i2.wp.com'])

const assertAllowedUrl = (value) => {
  const url = new URL(value)
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('博客封面地址不在允许范围内')
  }
  return url
}

const detectFormat = (bytes) => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) return 'gif'
  throw new Error('博客封面不是支持的图片格式')
}

const readLimited = async (response) => {
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_COVER_BYTES) throw new Error('博客封面过大')
    return bytes
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_COVER_BYTES) {
      await reader.cancel()
      throw new Error('博客封面过大')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks, total)
}

const downloadCover = async (sourceUrl, { fetchImpl = globalThis.fetch } = {}) => {
  let url = assertAllowedUrl(sourceUrl).href
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    for (let redirect = 0; redirect <= 2; redirect += 1) {
      const response = await fetchImpl(url, { signal: controller.signal, redirect: 'manual' })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location || redirect === 2) throw new Error('博客封面重定向失败')
        url = assertAllowedUrl(new URL(location, url).href).href
        continue
      }
      if (!response.ok) throw new Error(`博客封面 HTTP ${response.status}`)
      const size = Number(response.headers.get('content-length') || 0)
      if (size > MAX_COVER_BYTES) throw new Error('博客封面过大')
      if (!String(response.headers.get('content-type') || '').toLowerCase().startsWith('image/')) {
        throw new Error('博客封面响应不是图片')
      }
      const bytes = await readLimited(response)
      return { bytes, extension: detectFormat(bytes) }
    }
    throw new Error('博客封面重定向失败')
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { downloadCover }
