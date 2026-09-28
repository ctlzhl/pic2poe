const { HIDDEN_CATEGORY_IDS, isHiddenPost, normalizeCategories, normalizePost } = require('./blog-core')

const WORDPRESS_API_BASE = String(process.env.WORDPRESS_API_BASE || 'https://shengxiluo.me/wp-json/wp/v2').replace(/\/$/, '')
const CACHE_TTL_MS = 5 * 60 * 1000
const CATEGORY_CACHE_TTL_MS = 60 * 60 * 1000
const HOME_SNAPSHOT_COLLECTION = 'blogHomeCache'
const HOME_SNAPSHOT_ID = 'latest-three'
const HOME_REFRESH_TRIGGER = 'refresh-home-blog-every-5-minutes'
const cache = new Map()
let sharedDb

const getDatabase = () => {
  if (!sharedDb) {
    const cloud = require('wx-server-sdk')
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
    sharedDb = cloud.database()
  }
  return sharedDb
}

const fail = (code, message) => ({ ok: false, code, message })

const buildListPath = ({ page, pageSize, categoryId } = {}) => {
  const selectedCategoryId = Number(categoryId)
  const categoryQuery = Number.isInteger(selectedCategoryId) && selectedCategoryId > 0 ? `&categories=${selectedCategoryId}` : ''
  // 列表无需正文 HTML；WordPress 默认会带回完整正文，体积会随文章长度明显增加。
  return `/posts?_embed=1&_fields=id,date,title,excerpt,_embedded&per_page=${pageSize}&page=${page}&orderby=date&order=desc&categories_exclude=${HIDDEN_CATEGORY_IDS.join(',')}${categoryQuery}`
}

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

const withCache = async (key, request, ttlMs = CACHE_TTL_MS) => {
  const cached = fromCache(key)
  if (cached) return cached
  let lastError
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await request()
      cache.set(key, { data, expiresAt: Date.now() + ttlMs })
      return data
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const createHandler = ({ database = getDatabase, request = fetchJson } = {}) => async (event = {}) => {
  const action = event.action === 'detail' || event.action === 'categories' ? event.action : 'list'
  try {
    const isHomeRefresh = event.Type === 'Timer' && event.TriggerName === HOME_REFRESH_TRIGGER
    if (isHomeRefresh) {
      const result = await request(buildListPath({ page: 1, pageSize: 3 }))
      if (!Array.isArray(result.data)) throw new Error('WordPress 首页文章格式无效')
      const snapshot = {
        posts: result.data.map((post) => normalizePost(post, { includeContent: false })),
        totalPages: result.totalPages,
        updatedAtMs: Date.now()
      }
      await database().collection(HOME_SNAPSHOT_COLLECTION).doc(HOME_SNAPSHOT_ID).set({ data: snapshot })
      return { ok: true, data: { updatedAtMs: snapshot.updatedAtMs, count: snapshot.posts.length } }
    }

    if (action === 'detail') {
      const postId = Number(event.postId)
      if (!Number.isInteger(postId) || postId <= 0) return fail('INVALID_POST', '文章不存在或已下线。')
      const result = await withCache(`detail:${postId}`, () => request(`/posts/${postId}?_embed=1`))
      if (isHiddenPost(result.data)) return fail('POST_NOT_FOUND', '文章不存在或已下线。')
      return { ok: true, data: { post: normalizePost(result.data) } }
    }

    if (action === 'categories') {
      const result = await withCache(
        'categories',
        () => request('/categories?per_page=100&hide_empty=true&orderby=count&order=desc'),
        CATEGORY_CACHE_TTL_MS
      )
      return { ok: true, data: { categories: normalizeCategories(result.data) } }
    }

    const page = Math.max(1, Number(event.page) || 1)
    const pageSize = Math.min(10, Math.max(1, Number(event.pageSize) || 3))
    const categoryId = Number.isInteger(Number(event.categoryId)) && Number(event.categoryId) > 0 ? Number(event.categoryId) : 0
    const isHomeList = page === 1 && pageSize === 3 && categoryId === 0
    if (isHomeList) {
      try {
        const snapshot = (await database().collection(HOME_SNAPSHOT_COLLECTION).doc(HOME_SNAPSHOT_ID).get()).data
        if (snapshot && Array.isArray(snapshot.posts)) {
          return {
            ok: true,
            data: { posts: snapshot.posts, page, pageSize, totalPages: snapshot.totalPages || 1, hasMore: (snapshot.totalPages || 1) > 1 }
          }
        }
      } catch (error) {
        console.warn('读取首页博客快照失败，回源 WordPress:', error?.message || error)
      }
    }

    const result = await withCache(`list:${page}:${pageSize}:${categoryId}`, () => request(buildListPath({ page, pageSize, categoryId })))
    const posts = (Array.isArray(result.data) ? result.data : []).map((post) => normalizePost(post, { includeContent: false }))
    if (isHomeList) {
      try {
        await database().collection(HOME_SNAPSHOT_COLLECTION).doc(HOME_SNAPSHOT_ID).set({
          data: { posts, totalPages: result.totalPages, updatedAtMs: Date.now() }
        })
      } catch (error) {
        console.warn('写入首页博客快照失败:', error?.message || error)
      }
    }
    return {
      ok: true,
      data: {
        posts,
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

exports.main = createHandler()
module.exports.buildListPath = buildListPath
module.exports.createHandler = createHandler
