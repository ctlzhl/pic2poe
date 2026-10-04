const { HIDDEN_CATEGORY_IDS, isHiddenPost, normalizeCategories, normalizePost } = require('./blog-core')
const { SNAPSHOT_SIZE, pageFromSnapshot, categoryPageFromSnapshot, pendingCoverIndexes, overlayCachedCovers, cacheCovers, queueRetiredCovers, dueCoverIds } = require('./snapshot-core')
const { downloadCover } = require('./cover-download')

const WORDPRESS_API_BASE = String(process.env.WORDPRESS_API_BASE || 'https://shengxiluo.me/wp-json/wp/v2').replace(/\/$/, '')
const CACHE_TTL_MS = 5 * 60 * 1000
const CATEGORY_CACHE_TTL_MS = 60 * 60 * 1000
const SNAPSHOT_COLLECTION = 'blogHomeCache'
const SNAPSHOT_ID = 'latest-fifty'
const REFRESH_TRIGGERS = new Set(['refresh-blog-daily'])
const COVER_BATCH_SIZE = 4
const MAX_COVERS_PER_REFRESH = 16
const COVER_REFRESH_BUDGET_MS = 60 * 1000
const COVER_CLEANUP_BATCH_SIZE = 20
const cache = new Map()
let sharedDb
let sharedCloud

const getCloud = () => {
  if (!sharedCloud) {
    sharedCloud = require('wx-server-sdk')
    sharedCloud.init({ env: sharedCloud.DYNAMIC_CURRENT_ENV })
  }
  return sharedCloud
}

const getDatabase = () => {
  if (!sharedDb) {
    sharedDb = getCloud().database()
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

const buildRefreshPath = () => `/posts?_embed=1&_fields=id,date,modified,title,excerpt,content,categories,_embedded&per_page=${SNAPSHOT_SIZE}&page=1&orderby=date&order=desc&categories_exclude=${HIDDEN_CATEGORY_IDS.join(',')}`

const buildOlderPath = ({ page, pageSize, before, categoryId, offset = 0 }) =>
  `${buildListPath({ page, pageSize, categoryId })}&before=${encodeURIComponent(before)}${offset ? `&offset=${offset}` : ''}`

const olderBoundary = (snapshot, categoryId) => {
  const publishedAt = snapshot.posts.at(-1).publishedAt
  const timestamp = Date.parse(`${publishedAt}Z`)
  if (!Number.isFinite(timestamp)) return null
  const boundaryIds = new Set(snapshot.posts
    .filter((post) => post.publishedAt === publishedAt && (!categoryId || post.categoryIds?.includes(categoryId)))
    .map((post) => post.id))
  return { before: new Date(timestamp + 1000).toISOString().slice(0, 19), boundaryIds }
}

const fetchJson = async (path, { timeoutMs = 5000 } = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${WORDPRESS_API_BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`WordPress HTTP ${response.status}`)
    return {
      data: await response.json(),
      totalPages: Number(response.headers.get('x-wp-totalpages') || 1),
      totalPosts: Number(response.headers.get('x-wp-total') || 0)
    }
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

const createHandler = ({
  database = getDatabase,
  request = fetchJson,
  storage = null,
  getContext = () => getCloud().getWXContext(),
  downloadCover: fetchCover = downloadCover
} = {}) => async (event = {}) => {
  const action = event.action === 'detail' || event.action === 'categories' ? event.action : 'list'
  try {
    const snapshotDocument = () => database().collection(SNAPSHOT_COLLECTION).doc(SNAPSHOT_ID)
    const readSnapshot = async () => {
      try { return (await snapshotDocument().get()).data || null } catch (error) {
        console.warn('读取博客快照失败:', error?.message || error)
        return null
      }
    }
    const cleanupExpiredCovers = async () => {
      const latest = await readSnapshot()
      if (!latest) return
      const due = dueCoverIds(latest.coverCleanup, latest.posts, Date.now()).slice(0, COVER_CLEANUP_BATCH_SIZE)
      if (!due.length) return
      try {
        const result = await (storage || getCloud()).deleteFile({ fileList: due })
        const requested = new Set(due)
        const deleted = new Set((result.fileList || [])
          .filter((file) => requested.has(file.fileID) && Number(file.status) === 0)
          .map((file) => file.fileID))
        if (deleted.size) {
          await database().runTransaction(async (transaction) => {
            const current = (await transaction.collection(SNAPSHOT_COLLECTION).doc(SNAPSHOT_ID).get()).data
            await transaction.collection(SNAPSHOT_COLLECTION).doc(SNAPSHOT_ID).update({
              data: { coverCleanup: (current.coverCleanup || []).filter((item) => !deleted.has(item.fileId)) }
            })
          })
        }
        if (deleted.size !== due.length) console.warn('博客旧封面仍待清理:', due.length - deleted.size)
      } catch (error) {
        console.warn('清理博客旧封面失败:', error?.message || error)
      }
    }
    const hydrateImages = async (posts) => {
      const withFallback = posts.map((post) => post.featuredImage || !post.sourceImageUrl
        ? post
        : { ...post, featuredImage: post.sourceImageUrl })
      const fileList = [...new Set(posts.map((post) => post.coverFileId).filter(Boolean))]
      if (!fileList.length) return withFallback
      try {
        const result = await (storage || getCloud()).getTempFileURL({ fileList })
        const urls = new Map((result.fileList || []).filter((file) => file.tempFileURL)
          .map((file) => [file.fileID, file.tempFileURL]))
        return withFallback.map((post) => post.coverFileId
          ? { ...post, featuredImage: urls.get(post.coverFileId) || post.featuredImage }
          : post)
      } catch (error) {
        console.warn('获取博客封面地址失败:', error?.message || error)
        return withFallback
      }
    }

    if (event.Type === 'Timer' && REFRESH_TRIGGERS.has(event.TriggerName)) {
      const context = getContext() || {}
      if (context.OPENID) return fail('INVALID_ACTION', '不支持此操作。')
      const previous = await readSnapshot()
      if (previous?.updatedAtMs && Date.now() - previous.updatedAtMs < 20 * 60 * 60 * 1000 && !previous.coverSync?.pending) {
        await cleanupExpiredCovers()
        return { ok: true, data: { status: 'fresh', updatedAtMs: previous.updatedAtMs, count: previous.posts?.length || 0, coverSync: previous.coverSync } }
      }
      const [result, categoryResult] = await Promise.all([
        request(buildRefreshPath(), { timeoutMs: 20000 }),
        request('/categories?per_page=100&hide_empty=true&orderby=count&order=desc', { timeoutMs: 20000 })
      ])
      if (!Array.isArray(result.data) || !result.data.every((post) => Number.isInteger(Number(post.id)) && Number(post.id) > 0)) {
        throw new Error('WordPress 文章列表格式无效')
      }
      const posts = result.data.map((post) => normalizePost(post, { includeContent: false }))
      const cachedPosts = await cacheCovers(posts, previous, { maxDownloads: 0 })
      const snapshot = {
        posts: cachedPosts,
        coverCleanup: queueRetiredCovers(previous?.coverCleanup, previous?.posts, cachedPosts, Date.now()),
        categories: Array.isArray(categoryResult.data) ? normalizeCategories(categoryResult.data) : previous?.categories || [],
        totalPosts: result.totalPosts || cachedPosts.length + (cachedPosts.length === SNAPSHOT_SIZE ? 1 : 0),
        updatedAtMs: Date.now()
      }
      const pending = pendingCoverIndexes(posts, cachedPosts)
      const coverSync = {
        eligible: posts.filter((post) => post.featuredImage).length,
        attempted: 0,
        updated: 0,
        failed: 0,
        current: 0,
        covered: 0,
        pending: pending.length
      }
      const updateCoverCounts = () => {
        coverSync.current = coverSync.eligible - pendingCoverIndexes(posts, snapshot.posts).length
        coverSync.covered = snapshot.posts.filter((post) => post.coverFileId).length
        coverSync.pending = coverSync.eligible - coverSync.current
        snapshot.coverSync = { ...coverSync }
      }
      updateCoverCounts()
      await snapshotDocument().set({ data: snapshot })
      const deadline = Date.now() + COVER_REFRESH_BUDGET_MS
      for (let start = 0; start < Math.min(pending.length, MAX_COVERS_PER_REFRESH) && Date.now() < deadline; start += COVER_BATCH_SIZE) {
        const indexes = pending.slice(start, start + COVER_BATCH_SIZE)
        const oldBatchPosts = indexes.map((index) => snapshot.posts[index])
        const batch = await cacheCovers(indexes.map((index) => posts[index]), { posts: snapshot.posts }, {
          downloadCover: fetchCover,
          uploadCover: async (cloudPath, bytes) => (await (storage || getCloud()).uploadFile({ cloudPath, fileContent: bytes })).fileID,
          onError: (postId, error) => {
            coverSync.failed += 1
            console.warn(`博客封面 ${postId} 同步失败:`, error?.message || error)
          }
        })
        indexes.forEach((index, position) => { snapshot.posts[index] = batch[position] })
        snapshot.coverCleanup = queueRetiredCovers(snapshot.coverCleanup, oldBatchPosts, snapshot.posts, Date.now())
        coverSync.attempted += indexes.length
        coverSync.updated = coverSync.attempted - coverSync.failed
        updateCoverCounts()
        try {
          await snapshotDocument().set({ data: snapshot })
        } catch (error) {
          // 写入结果不确定时先重读快照，只回收确实未被持久快照引用的新文件。
          const persisted = await readSnapshot()
          if (persisted) {
            const referenced = new Set((persisted.posts || []).map((post) => post.coverFileId).filter(Boolean))
            const uncommitted = [...new Set(batch.map((post) => post.coverFileId)
              .filter((fileId) => fileId?.includes('/blog/covers/') && !referenced.has(fileId)))]
            if (uncommitted.length) {
              try {
                await (storage || getCloud()).deleteFile({ fileList: uncommitted })
              } catch (cleanupError) {
                console.warn('回收未写入快照的封面失败:', cleanupError?.message || cleanupError)
              }
            }
          }
          throw error
        }
      }
      await cleanupExpiredCovers()
      console.info('博客封面同步结果:', JSON.stringify(coverSync))
      return { ok: true, data: { updatedAtMs: snapshot.updatedAtMs, count: cachedPosts.length, coverSync } }
    }
    if (event.Type === 'Timer') return fail('INVALID_ACTION', '不支持此操作。')

    const snapshot = await readSnapshot()
    if (action === 'categories') {
      if (Array.isArray(snapshot?.categories) && snapshot.categories.length) return { ok: true, data: { categories: snapshot.categories } }
      const result = await withCache('categories', () => request('/categories?per_page=100&hide_empty=true&orderby=count&order=desc'), CATEGORY_CACHE_TTL_MS)
      return { ok: true, data: { categories: normalizeCategories(result.data) } }
    }

    if (action === 'detail') {
      const postId = Number(event.postId)
      if (!Number.isInteger(postId) || postId <= 0) return fail('INVALID_POST', '文章不存在或已下线。')
      const result = await withCache(`detail:${postId}`, () => request(`/posts/${postId}?_embed=1`))
      if (isHiddenPost(result.data)) return fail('POST_NOT_FOUND', '文章不存在或已下线。')
      const post = normalizePost(result.data)
      return { ok: true, data: { post: (await hydrateImages(overlayCachedCovers([post], snapshot)))[0] } }
    }

    const page = Math.max(1, Number(event.page) || 1)
    const pageSize = Math.min(10, Math.max(1, Number(event.pageSize) || 3))
    const categoryId = Number.isInteger(Number(event.categoryId)) && Number(event.categoryId) > 0 ? Number(event.categoryId) : 0
    const readOlderPage = async (olderOffset, needed, selectedCategoryId) => {
      const boundary = olderBoundary(snapshot, selectedCategoryId)
      if (!boundary) return { posts: [], hasMore: false }
      const targetCount = olderOffset + needed
      const requestSize = Math.min(100, Math.max(1, targetCount + boundary.boundaryIds.size))
      const older = []
      let result
      let sourcePage = 1
      do {
        const sourcePath = buildOlderPath({ page: sourcePage, pageSize: requestSize, before: boundary.before, categoryId: selectedCategoryId })
        result = await withCache(`list:${sourcePath}`, () => request(sourcePath))
        older.push(...(Array.isArray(result.data) ? result.data : [])
          .map((post) => normalizePost(post, { includeContent: false }))
          .filter((post) => !boundary.boundaryIds.has(post.id)))
        if (older.length >= targetCount || sourcePage >= result.totalPages || !result.data?.length) break
        sourcePage += 1
      } while (true)
      const posts = older.slice(olderOffset, targetCount)
      const hasMore = result.totalPosts > 0
        ? olderOffset + posts.length < Math.max(0, result.totalPosts - boundary.boundaryIds.size)
        : older.length > targetCount || sourcePage < result.totalPages
      return { posts, hasMore, totalPages: result.totalPages }
    }
    if (categoryId) {
      const cachedPage = categoryPageFromSnapshot(snapshot, categoryId, page, pageSize)
      if (cachedPage) {
        if (!cachedPage.olderNeeded) return { ok: true, data: { posts: await hydrateImages(cachedPage.posts), page, pageSize, hasMore: cachedPage.hasMore } }
        const olderPage = await readOlderPage(cachedPage.olderOffset, cachedPage.olderNeeded, categoryId)
        const visiblePosts = await hydrateImages([...cachedPage.posts, ...olderPage.posts])
        return { ok: true, data: { posts: visiblePosts, page, pageSize, hasMore: olderPage.hasMore } }
      }
    } else {
      const cachedPage = pageFromSnapshot(snapshot, page, pageSize)
      if (cachedPage) return { ok: true, data: { posts: await hydrateImages(cachedPage.posts), page, pageSize, hasMore: cachedPage.hasMore } }
    }

    const cachedPages = !categoryId && snapshot?.posts?.length ? Math.ceil(snapshot.posts.length / pageSize) : 0
    const isOlderPage = cachedPages && page > cachedPages && snapshot.posts.length === SNAPSHOT_SIZE
    if (isOlderPage) {
      const olderPage = await readOlderPage((page - cachedPages - 1) * pageSize, pageSize, 0)
      return { ok: true, data: { posts: await hydrateImages(olderPage.posts), page, pageSize, totalPages: olderPage.totalPages, hasMore: olderPage.hasMore } }
    }
    const sourcePath = buildListPath({ page, pageSize, categoryId })
    const result = await withCache(`list:${sourcePath}`, () => request(sourcePath))
    const posts = (Array.isArray(result.data) ? result.data : []).map((post) => normalizePost(post, {
      includeContent: false
    }))
    const visiblePosts = await hydrateImages(overlayCachedCovers(posts, snapshot))
    return {
      ok: true,
      data: {
        posts: visiblePosts,
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
module.exports.buildRefreshPath = buildRefreshPath
module.exports.createHandler = createHandler
