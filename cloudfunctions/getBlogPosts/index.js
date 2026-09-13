const { normalizePost } = require('./blog-core')

const WORDPRESS_API_BASE = String(process.env.WORDPRESS_API_BASE || 'https://shengxiluo.me/wp-json/wp/v2').replace(/\/$/, '')
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map()

const fail = (code, message) => ({ ok: false, code, message })

const fetchJson = async (path) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`${WORDPRESS_API_BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`WordPress HTTP ${response.status}`)
    return { data: await response.json(), totalPages: Number(response.headers.get('x-wp-totalpages') || 1) }
  } finally {
    clearTimeout(timeout)
  }
}

const fromCache = (key) => {
  const entry = cache.get(key)
  return entry && entry.expiresAt > Date.now() ? entry.data : null
}

const withCache = async (key, request) => {
  const cached = fromCache(key)
  if (cached) return cached
  let lastError
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await request()
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
      return data
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

exports.main = async (event = {}) => {
  const action = event.action === 'detail' ? 'detail' : 'list'
  try {
    if (action === 'detail') {
      const postId = Number(event.postId)
      if (!Number.isInteger(postId) || postId <= 0) return fail('INVALID_POST', '文章不存在或已下线。')
      const result = await withCache(`detail:${postId}`, () => fetchJson(`/posts/${postId}?_embed=1`))
      return { ok: true, data: { post: normalizePost(result.data) } }
    }

    const page = Math.max(1, Number(event.page) || 1)
    const pageSize = Math.min(10, Math.max(1, Number(event.pageSize) || 3))
    const result = await withCache(`list:${page}:${pageSize}`, () => fetchJson(`/posts?_embed=1&per_page=${pageSize}&page=${page}&orderby=date&order=desc`))
    return {
      ok: true,
      data: {
        posts: (Array.isArray(result.data) ? result.data : []).map((post) => normalizePost(post, { includeContent: false })),
        page,
        pageSize,
        totalPages: result.totalPages,
        hasMore: page < result.totalPages
      }
    }
  } catch (error) {
    console.error('获取博客文章失败:', error && error.message ? error.message : error)
    return fail('BLOG_UNAVAILABLE', '博客暂时无法加载，请稍后再试。')
  }
}
