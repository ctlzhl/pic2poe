const { createHash, randomUUID } = require('node:crypto')

const SNAPSHOT_SIZE = 50
const COVER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const isManagedCoverFile = (fileId) => /^cloud:\/\/[^/]+\/blog\/covers\/[^/]+$/.test(fileId || '')

const queueRetiredCovers = (existing, previousPosts, currentPosts, nowMs) => {
  const previousIds = new Set((previousPosts || []).map((post) => post.coverFileId).filter(Boolean))
  const currentIds = new Set((currentPosts || []).map((post) => post.coverFileId).filter(Boolean))
  const queue = (Array.isArray(existing) ? existing : [])
    .filter((item) => !previousIds.has(item.fileId) && !currentIds.has(item.fileId))
  const queuedIds = new Set(queue.map((item) => item.fileId))
  for (const fileId of previousIds) {
    if (!isManagedCoverFile(fileId) || currentIds.has(fileId) || queuedIds.has(fileId)) continue
    queue.push({ fileId, deleteAfterMs: nowMs + COVER_RETENTION_MS })
    queuedIds.add(fileId)
  }
  return queue
}

const dueCoverIds = (queue, currentPosts, nowMs) => {
  const currentIds = new Set((currentPosts || []).map((post) => post.coverFileId).filter(Boolean))
  return (Array.isArray(queue) ? queue : [])
    .filter((item) => item.deleteAfterMs <= nowMs && isManagedCoverFile(item.fileId) && !currentIds.has(item.fileId))
    .map((item) => item.fileId)
}

const pageFromSnapshot = (snapshot, page, pageSize) => {
  if (!Array.isArray(snapshot?.posts)) return null
  const start = (page - 1) * pageSize
  if (start < 0 || start >= snapshot.posts.length) return null
  const end = start + pageSize
  const totalPosts = Number(snapshot.totalPosts) || snapshot.posts.length
  return {
    posts: snapshot.posts.slice(start, end),
    hasMore: end < snapshot.posts.length || totalPosts > snapshot.posts.length
  }
}

const categoryPageFromSnapshot = (snapshot, categoryId, page, pageSize) => {
  if (!Array.isArray(snapshot?.posts) || !snapshot.posts.every((post) => Array.isArray(post.categoryIds))) return null
  const matches = snapshot.posts.filter((post) => post.categoryIds.includes(categoryId))
  const start = (page - 1) * pageSize
  const posts = matches.slice(start, start + pageSize)
  const hasOlder = snapshot.posts.length === SNAPSHOT_SIZE && (Number(snapshot.totalPosts) || SNAPSHOT_SIZE + 1) > SNAPSHOT_SIZE
  return {
    posts,
    olderOffset: Math.max(0, start - matches.length),
    olderNeeded: hasOlder ? pageSize - posts.length : 0,
    hasMore: start + pageSize < matches.length || hasOlder
  }
}

const pendingCoverIndexes = (posts, cachedPosts) => posts.flatMap((post, index) => {
  const cached = cachedPosts[index]
  if (!post.featuredImage) return []
  const isCurrent = cached?.coverFileId && cached.sourceImageUrl === post.featuredImage &&
    (cached.coverModifiedAt ?? cached.modifiedAt) === post.modifiedAt
  return isCurrent ? [] : [index]
})

const overlayCachedCovers = (posts, snapshot) => {
  if (!Array.isArray(snapshot?.posts)) return posts
  const cachedById = new Map(snapshot.posts.map((post) => [post.id, post]))
  return posts.map((post) => {
    const cached = cachedById.get(post.id)
    return cached ? {
      ...post,
      featuredImage: '',
      sourceImageUrl: cached.sourceImageUrl || post.featuredImage,
      coverFileId: cached.coverFileId || ''
    } : post
  })
}

const cacheCovers = async (posts, previous, { downloadCover, uploadCover, onError = () => {}, maxDownloads = Infinity }) => {
  const previousById = new Map((previous?.posts || []).map((post) => [post.id, post]))
  const result = Array(posts.length)
  let nextIndex = 0
  let downloads = 0
  const worker = async () => {
    while (nextIndex < posts.length) {
      const index = nextIndex++
      const post = posts[index]
      const sourceImageUrl = post.featuredImage || ''
      const old = previousById.get(post.id)
      const oldCoverModifiedAt = old?.coverModifiedAt ?? old?.modifiedAt
      let coverFileId = ''
      let cachedSourceUrl = sourceImageUrl
      let coverModifiedAt = post.modifiedAt
      if (sourceImageUrl && old?.sourceImageUrl === sourceImageUrl && oldCoverModifiedAt === post.modifiedAt && old.coverFileId) {
        coverFileId = old.coverFileId
      } else if (sourceImageUrl && downloads < maxDownloads) {
        downloads += 1
        try {
          const { bytes, extension } = await downloadCover(sourceImageUrl)
          const hash = createHash('sha256').update(`${sourceImageUrl}\n${post.modifiedAt || ''}`).digest('hex').slice(0, 16)
          coverFileId = await uploadCover(`blog/covers/${post.id}-${hash}-${randomUUID()}.${extension}`, bytes)
          if (!coverFileId) throw new Error('博客封面上传未返回文件 ID')
        } catch (error) {
          coverFileId = old?.coverFileId || ''
          cachedSourceUrl = old?.sourceImageUrl || ''
          coverModifiedAt = oldCoverModifiedAt
          onError(post.id, error)
        }
      } else if (sourceImageUrl) {
        coverFileId = old?.coverFileId || ''
        cachedSourceUrl = old?.sourceImageUrl || sourceImageUrl
        coverModifiedAt = oldCoverModifiedAt ?? post.modifiedAt
      }
      result[index] = { ...post, sourceImageUrl: cachedSourceUrl, coverModifiedAt, featuredImage: '', coverFileId }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, posts.length) }, () => worker()))
  return result
}

module.exports = { SNAPSHOT_SIZE, pageFromSnapshot, categoryPageFromSnapshot, pendingCoverIndexes, overlayCachedCovers, cacheCovers, queueRetiredCovers, dueCoverIds }
