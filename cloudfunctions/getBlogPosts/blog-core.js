const decodeEntities = (value = '') => String(value)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")

const stripHtml = (value = '') => decodeEntities(value)
  .replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripInlineHtml = (value = '') => decodeEntities(value)
  .replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const safeUrl = (value = '') => {
  const url = String(value).trim()
  return /^https:\/\//i.test(url) ? url : ''
}

const sanitizeContentHtml = (value = '') => {
  let html = String(value)
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '')

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag, attributes = '') => {
    const tag = rawTag.toLowerCase()
    const isClosing = /^<\//.test(match)
    if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'b', 'i', 'br', 'a', 'img'].includes(tag)) return ''
    if (isClosing) return tag === 'br' || tag === 'img' ? '' : `</${tag}>`
    if (tag === 'a') {
      const href = (attributes.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1]
      const safeHref = safeUrl(href)
      return safeHref ? `<a href="${safeHref}">` : '<a>'
    }
    if (tag === 'img') {
      const src = (attributes.match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1]
      const alt = (attributes.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1] || ''
      const safeSrc = safeUrl(src)
      return safeSrc ? `<img src="${safeSrc}" alt="${stripHtml(alt)}">` : ''
    }
    return `<${tag}>`
  })

  return html.trim()
}

const getCategoryName = (embedded = {}) => {
  const groups = Array.isArray(embedded['wp:term']) ? embedded['wp:term'] : []
  const terms = groups.flat().filter(Boolean)
  return String(terms[0]?.name || '').trim()
}

const normalizePost = (post = {}, { includeContent = true } = {}) => {
  const embedded = post._embedded || {}
  const media = Array.isArray(embedded['wp:featuredmedia']) ? embedded['wp:featuredmedia'][0] : null
  const contentHtml = includeContent ? sanitizeContentHtml(post.content?.rendered || '') : ''
  const excerpt = stripHtml(post.excerpt?.rendered || '') || stripHtml(post.content?.rendered || '').slice(0, 200)

  return {
    id: Number(post.id) || 0,
    title: stripInlineHtml(post.title?.rendered || '未命名文章'),
    excerpt,
    contentHtml,
    featuredImage: safeUrl(media?.source_url || ''),
    categoryName: getCategoryName(embedded),
    publishedAt: String(post.date || '')
  }
}

module.exports = { normalizePost, sanitizeContentHtml, stripHtml }
