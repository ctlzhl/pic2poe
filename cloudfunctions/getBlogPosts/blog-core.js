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

const HIDDEN_CATEGORY_IDS = Object.freeze([343, 398])
const HIDDEN_CATEGORY_NAMES = new Set(['昨年今日', '就是瞎拍'])

const isHiddenPost = (post = {}) => {
  const categories = Array.isArray(post.categories) ? post.categories : []
  return categories.some((categoryId) => HIDDEN_CATEGORY_IDS.includes(Number(categoryId)))
}

const removeLeadingSummary = (value = '') => {
  const html = String(value)
  const firstContentTag = html.search(/<(?:h[1-6]|p|ul|ol|blockquote|img)\b/i)
  if (firstContentTag <= 0) return html

  const leadingContent = stripHtml(html.slice(0, firstContentTag))
  return leadingContent.includes('全文摘要') || leadingContent.includes('摘要') ? html.slice(firstContentTag) : html
}

const sanitizeContentHtml = (value = '') => {
  let html = String(value)
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '')

  html = removeLeadingSummary(html)

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
      return safeSrc ? `<img src="${safeSrc}" alt="${stripHtml(alt)}" style="width:100%;height:auto;display:block;">` : ''
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

const normalizeCategories = (categories = []) => (Array.isArray(categories) ? categories : [])
  .map((category) => ({
    id: Number(category?.id) || 0,
    name: stripInlineHtml(category?.name || '')
  }))
  .filter((category) => category.id > 0 && category.name && !HIDDEN_CATEGORY_IDS.includes(category.id) && !HIDDEN_CATEGORY_NAMES.has(category.name))

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

module.exports = { HIDDEN_CATEGORY_IDS, isHiddenPost, normalizeCategories, normalizePost, sanitizeContentHtml, stripHtml }
