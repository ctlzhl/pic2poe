const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try { return require('./snapshot-core') } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('首页和前五页从同一份 50 篇快照分页，之后才回源', () => {
  const { pageFromSnapshot } = loadCore()
  assert.equal(typeof pageFromSnapshot, 'function')
  const snapshot = { posts: Array.from({ length: 50 }, (_, index) => ({ id: index + 1 })), totalPosts: 83 }
  assert.deepEqual(pageFromSnapshot(snapshot, 1, 3), { posts: snapshot.posts.slice(0, 3), hasMore: true })
  assert.deepEqual(pageFromSnapshot(snapshot, 5, 10), { posts: snapshot.posts.slice(40, 50), hasMore: true })
  assert.equal(pageFromSnapshot(snapshot, 6, 10), null)
})

test('类目快照按文章分类分页，并指出跨出近 50 篇时需要补读的数量', () => {
  const { categoryPageFromSnapshot } = loadCore()
  const snapshot = {
    posts: Array.from({ length: 50 }, (_, index) => ({ id: index + 1, categoryIds: index < 7 ? [7] : [8] })),
    totalPosts: 80
  }
  assert.deepEqual(categoryPageFromSnapshot(snapshot, 7, 1, 5), {
    posts: snapshot.posts.slice(0, 5), olderOffset: 0, olderNeeded: 0, hasMore: true
  })
  assert.deepEqual(categoryPageFromSnapshot(snapshot, 7, 2, 5), {
    posts: snapshot.posts.slice(5, 7), olderOffset: 0, olderNeeded: 3, hasMore: true
  })
  assert.deepEqual(categoryPageFromSnapshot(snapshot, 7, 3, 5), {
    posts: [], olderOffset: 3, olderNeeded: 5, hasMore: true
  })
  assert.equal(categoryPageFromSnapshot({ posts: [{ id: 1 }] }, 7, 1, 5), null)
})

test('未处理的封面保留旧图，并在下一轮仍列为待同步', async () => {
  const { cacheCovers, pendingCoverIndexes } = loadCore()
  const desired = [{ id: 8, featuredImage: 'https://shengxiluo.me/new.jpg', modifiedAt: 'new' }]
  const previous = { posts: [{ id: 8, sourceImageUrl: 'https://shengxiluo.me/old.jpg', coverModifiedAt: 'old', coverFileId: 'cloud://old' }] }
  const staged = await cacheCovers(desired, previous, {
    maxDownloads: 0,
    downloadCover: async () => { throw new Error('不应下载') },
    uploadCover: async () => { throw new Error('不应上传') }
  })
  assert.equal(staged[0].coverFileId, 'cloud://old')
  assert.deepEqual(pendingCoverIndexes(desired, staged), [0])
})

test('同步封面复用未变图片，下载失败保留旧封面，不把博客直链写进快照', async () => {
  const { cacheCovers } = loadCore()
  assert.equal(typeof cacheCovers, 'function')
  const previous = { posts: [
    { id: 1, sourceImageUrl: 'https://shengxiluo.me/a.jpg', coverFileId: 'cloud://old-a' },
    { id: 2, sourceImageUrl: 'https://shengxiluo.me/old-b.jpg', coverFileId: 'cloud://old-b' }
  ] }
  const posts = [
    { id: 1, featuredImage: 'https://shengxiluo.me/a.jpg' },
    { id: 2, featuredImage: 'https://shengxiluo.me/new-b.jpg' },
    { id: 3, featuredImage: 'https://shengxiluo.me/c.jpg' },
    { id: 4, featuredImage: '' }
  ]
  const downloaded = []
  const cached = await cacheCovers(posts, previous, {
    downloadCover: async (url) => {
      downloaded.push(url)
      if (url.endsWith('new-b.jpg')) throw new Error('暂时下载失败')
      return { bytes: Buffer.from('jpg'), extension: 'jpg' }
    },
    uploadCover: async (path) => `cloud://${path}`
  })
  assert.deepEqual(downloaded.sort(), ['https://shengxiluo.me/c.jpg', 'https://shengxiluo.me/new-b.jpg'])
  assert.equal(cached[0].coverFileId, 'cloud://old-a')
  assert.equal(cached[1].coverFileId, 'cloud://old-b')
  assert.equal(cached[1].sourceImageUrl, 'https://shengxiluo.me/old-b.jpg')
  assert.match(cached[2].coverFileId, /^cloud:\/\/blog\/covers\/3-/)
  assert.equal(cached[3].coverFileId, '')
  assert.ok(cached.every((post) => post.featuredImage === ''))
})

test('封面下载失败后的下一轮同步会重试', async () => {
  const { cacheCovers } = loadCore()
  const source = 'https://shengxiluo.me/new.jpg'
  const old = { id: 8, sourceImageUrl: 'https://shengxiluo.me/old.jpg', modifiedAt: 'old', coverFileId: 'cloud://old' }
  const post = { id: 8, featuredImage: source, modifiedAt: 'new' }
  const failed = await cacheCovers([post], { posts: [old] }, {
    downloadCover: async () => { throw new Error('网络错误') },
    uploadCover: async () => { throw new Error('不应上传') }
  })
  const downloaded = []
  const retried = await cacheCovers([post], { posts: failed }, {
    downloadCover: async (url) => { downloaded.push(url); return { bytes: Buffer.from('new'), extension: 'jpg' } },
    uploadCover: async (path) => `cloud://${path}`
  })
  assert.deepEqual(downloaded, [source])
  assert.notEqual(retried[0].coverFileId, 'cloud://old')
})

test('类目实时结果中的近 50 篇复用云端封面，旧文章仍保留实时图片', () => {
  const { overlayCachedCovers } = loadCore()
  assert.equal(typeof overlayCachedCovers, 'function')
  const posts = [
    { id: 8, featuredImage: 'https://shengxiluo.me/a.jpg' },
    { id: 99, featuredImage: 'https://shengxiluo.me/b.jpg' }
  ]
  const result = overlayCachedCovers(posts, { posts: [{ id: 8, coverFileId: 'cloud://cover' }] })
  assert.equal(result[0].coverFileId, 'cloud://cover')
  assert.equal(result[0].featuredImage, '')
  assert.equal(result[1].featuredImage, 'https://shengxiluo.me/b.jpg')
})

test('文章更新后即使封面地址不变也重新缓存封面', async () => {
  const { cacheCovers } = loadCore()
  const previous = { posts: [{ id: 8, sourceImageUrl: 'https://shengxiluo.me/cover.jpg', modifiedAt: '2026-09-01', coverFileId: 'cloud://old' }] }
  const paths = []
  const posts = await cacheCovers([{ id: 8, featuredImage: 'https://shengxiluo.me/cover.jpg', modifiedAt: '2026-09-02' }], previous, {
    downloadCover: async () => ({ bytes: Buffer.from('new'), extension: 'jpg' }),
    uploadCover: async (path) => { paths.push(path); return `cloud://${path}` }
  })
  assert.equal(paths.length, 1)
  assert.notEqual(posts[0].coverFileId, 'cloud://old')
})

test('同一封面重新进入快照时不复用已排队清理的云存储路径', async () => {
  const { cacheCovers } = loadCore()
  const post = { id: 8, featuredImage: 'https://shengxiluo.me/cover.jpg', modifiedAt: '2026-09-02' }
  const upload = {
    downloadCover: async () => ({ bytes: Buffer.from('jpg'), extension: 'jpg' }),
    uploadCover: async (path) => `cloud://${path}`
  }
  const first = await cacheCovers([post], { posts: [] }, upload)
  const returned = await cacheCovers([post], { posts: [] }, upload)
  assert.notEqual(first[0].coverFileId, returned[0].coverFileId)
})

test('封面替换或文章移出快照后延迟回收旧文件，不登记仍被引用的封面', () => {
  const { queueRetiredCovers } = loadCore()
  assert.equal(typeof queueRetiredCovers, 'function')
  const oldCover = 'cloud://env/blog/covers/1-old.jpg'
  const sharedCover = 'cloud://env/blog/covers/shared.jpg'
  const goneCover = 'cloud://env/blog/covers/3-old.jpg'
  const queued = queueRetiredCovers([], [
    { coverFileId: oldCover },
    { coverFileId: sharedCover },
    { coverFileId: goneCover }
  ], [
    { coverFileId: 'cloud://env/blog/covers/1-new.jpg' },
    { coverFileId: sharedCover }
  ], 1000)
  assert.deepEqual(queued, [
    { fileId: oldCover, deleteAfterMs: 1000 + 7 * 24 * 60 * 60 * 1000 },
    { fileId: goneCover, deleteAfterMs: 1000 + 7 * 24 * 60 * 60 * 1000 }
  ])
  const reused = queueRetiredCovers(queued, [], [{ coverFileId: oldCover }], 2000)
  assert.deepEqual(reused, [queued[1]])
  const retiredAgain = queueRetiredCovers(reused, [{ coverFileId: oldCover }], [], 3000)
  assert.deepEqual(retiredAgain, [queued[1], { fileId: oldCover, deleteAfterMs: 3000 + 7 * 24 * 60 * 60 * 1000 }])
})

test('清理只选过期且未被当前快照引用的博客封面', () => {
  const { dueCoverIds } = loadCore()
  assert.equal(typeof dueCoverIds, 'function')
  const queue = [
    { fileId: 'cloud://env/blog/covers/old.jpg', deleteAfterMs: 9 },
    { fileId: 'cloud://env/blog/covers/current.jpg', deleteAfterMs: 9 },
    { fileId: 'cloud://env/blog/covers/future.jpg', deleteAfterMs: 11 },
    { fileId: 'cloud://env/users/another-file.jpg', deleteAfterMs: 9 }
  ]
  assert.deepEqual(dueCoverIds(queue, [{ coverFileId: 'cloud://env/blog/covers/current.jpg' }], 10), ['cloud://env/blog/covers/old.jpg'])
})
