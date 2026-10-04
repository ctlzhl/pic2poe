const assert = require('node:assert/strict')
const test = require('node:test')

const { buildListPath, createHandler } = require('./index')

test('buildListPath 为选中的类目附加 WordPress 分类筛选参数', () => {
  assert.equal(typeof buildListPath, 'function')
  assert.equal(
    buildListPath({ page: 2, pageSize: 10, categoryId: 7 }),
    '/posts?_embed=1&_fields=id,date,title,excerpt,_embedded&per_page=10&page=2&orderby=date&order=desc&categories_exclude=343,398&categories=7'
  )
})

test('buildListPath 未选择类目时请求全部文章', () => {
  assert.equal(
    buildListPath({ page: 1, pageSize: 3 }),
    '/posts?_embed=1&_fields=id,date,title,excerpt,_embedded&per_page=3&page=1&orderby=date&order=desc&categories_exclude=343,398'
  )
})

test('每日同步一次取最近 50 篇及正文首图候选', () => {
  const { buildRefreshPath } = require('./index')
  assert.equal(typeof buildRefreshPath, 'function')
  assert.match(buildRefreshPath(), /per_page=50/)
  assert.match(buildRefreshPath(), /_fields=[^&]*content/)
})

const makeDatabase = (initial = null, { failOnWrite = [] } = {}) => {
  let stored = initial
  const writes = []
  let writeCount = 0
  const database = {
    get stored() { return stored },
    get writes() { return writes },
    async runTransaction(callback) { return callback(database) },
    collection(name) {
      assert.equal(name, 'blogHomeCache')
      return {
        doc(id) {
          assert.equal(id, 'latest-fifty')
          return {
            async get() {
              if (!stored) throw new Error('document does not exist')
              return { data: structuredClone(stored) }
            },
            async set({ data }) {
              writeCount += 1
              if (failOnWrite.includes(writeCount)) throw new Error('模拟快照写入中断')
              stored = structuredClone(data)
              writes.push(stored)
            },
            async update({ data }) {
              stored = { ...stored, ...structuredClone(data) }
              writes.push(stored)
            }
          }
        }
      }
    }
  }
  return database
}

const wpPost = (id) => ({
  id,
  date: '2026-09-20T10:00:00',
  title: { rendered: `文章 ${id}` },
  excerpt: { rendered: '<p>摘要</p>' },
  _embedded: {}
})

test('首页列表优先返回云端快照，不等待 WordPress', async () => {
  assert.equal(typeof createHandler, 'function')
  const snapshot = { posts: [{ id: 11, title: '已缓存文章' }], totalPosts: 1, updatedAtMs: 100 }
  const db = makeDatabase(snapshot)
  const handler = createHandler({ database: () => db, request: async () => { throw new Error('不应访问 WordPress') } })
  const result = await handler({ page: 1, pageSize: 3 })
  assert.equal(result.ok, true)
  assert.deepEqual(result.data.posts, snapshot.posts)
  assert.equal(result.data.hasMore, false)
})

test('每日定时同步元数据与图片，首页展示云存储封面', async () => {
  assert.equal(typeof createHandler, 'function')
  const db = makeDatabase({ posts: [{ id: 1 }], totalPosts: 1 })
  let requests = 0
  const handler = createHandler({
    database: () => db,
    request: async (path) => {
      requests += 1
      if (path.startsWith('/categories')) return { data: [{ id: 7, name: '摄影' }] }
      assert.match(path, /per_page=50/)
      return { data: [{ ...wpPost(21), _embedded: { 'wp:featuredmedia': [{ source_url: 'https://shengxiluo.me/a.jpg' }] } }], totalPosts: 91 }
    },
    getContext: () => ({}),
    downloadCover: async () => ({ bytes: Buffer.from('jpg'), extension: 'jpg' }),
    storage: {
      uploadFile: async ({ cloudPath }) => ({ fileID: `cloud://${cloudPath}` }),
      getTempFileURL: async ({ fileList }) => ({ fileList: fileList.map((fileID) => ({ fileID, tempFileURL: `https://cdn.example.com/${fileID.slice(8)}`, status: 0 })) })
    }
  })
  const refreshed = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(refreshed.ok, true)
  assert.equal(db.stored.posts[0].id, 21)
  const response = await handler({ page: 1, pageSize: 3 })
  assert.equal(response.data.posts[0].title, '文章 21')
  assert.match(response.data.posts[0].featuredImage, /^https:\/\/cdn\.example\.com\/blog\/covers\/21-/)
  assert.equal(requests, 2)
})

test('客户端伪造 Timer 不得触发 WordPress 批量同步', async () => {
  const db = makeDatabase({ posts: [{ id: 1 }], totalPosts: 1 })
  const handler = createHandler({ database: () => db, getContext: () => ({ OPENID: 'attacker' }), request: async () => { throw new Error('不可回源') } })
  const response = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(response.ok, false)
  assert.equal(db.stored.posts[0].id, 1)
})

test('云端快照尚未建立时首页暂时回源，不在用户请求中同步 50 张图', async () => {
  assert.equal(typeof createHandler, 'function')
  const db = makeDatabase()
  const handler = createHandler({ database: () => db, request: async () => ({ data: [wpPost(31)], totalPages: 1 }) })
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    const response = await handler({ page: 1, pageSize: 3 })
    assert.equal(response.data.posts[0].id, 31)
    assert.equal(db.stored, null)
  } finally {
    console.warn = originalWarn
  }
})

test('超过 50 篇后按快照末篇日期读取旧文章，避免插入新文造成重复', async () => {
  const snapshot = {
    posts: Array.from({ length: 50 }, (_, index) => ({ id: index + 1, publishedAt: `2026-09-${String(30 - Math.floor(index / 2)).padStart(2, '0')}T00:00:00` })),
    totalPosts: 70
  }
  const paths = []
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async (path) => { paths.push(path); return { data: [wpPost(51)], totalPosts: 20, totalPages: 2 } }
  })
  const cached = await handler({ page: 5, pageSize: 10 })
  const older = await handler({ page: 6, pageSize: 10 })
  assert.equal(cached.data.posts[0].id, 41)
  assert.equal(older.data.posts[0].id, 51)
  assert.equal(older.data.hasMore, true)
  assert.equal(paths.length, 2)
  assert.match(paths[0], /before=2026-09-06T00%3A00%3A01/)
})

test('快照边界同秒发布的第 51 篇仍出现在下一页', async () => {
  const boundary = '2026-08-06T00:00:00'
  const snapshot = {
    posts: Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      publishedAt: index >= 48 ? boundary : '2026-09-07T00:00:00'
    })),
    totalPosts: 51
  }
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async (path) => {
      const query = new URLSearchParams(path.split('?')[1])
      const data = query.get('before') > boundary
        ? [wpPost(50, { date: boundary }), wpPost(51, { date: boundary }), wpPost(49, { date: boundary })]
        : []
      return { data, totalPosts: data.length, totalPages: 1 }
    }
  })
  const result = await handler({ page: 6, pageSize: 10 })
  assert.deepEqual(result.data.posts.map((post) => post.id), [51])
  assert.equal(result.data.hasMore, false)
})

test('类目列表实时读取，但近 50 篇文章仍使用已缓存的封面', async () => {
  const snapshot = { posts: [{ id: 41, coverFileId: 'cloud://cover-41' }] }
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async () => ({ data: [{ ...wpPost(41), _embedded: { 'wp:featuredmedia': [{ source_url: 'https://shengxiluo.me/old.jpg' }] } }], totalPages: 1 }),
    storage: { getTempFileURL: async () => ({ fileList: [{ fileID: 'cloud://cover-41', tempFileURL: 'https://cdn.example.com/cover-41' }] }) }
  })
  const result = await handler({ page: 1, pageSize: 10, categoryId: 7 })
  assert.equal(result.data.posts[0].featuredImage, 'https://cdn.example.com/cover-41')
})

test('近 50 篇内的类目页直接用快照，不访问 WordPress', async () => {
  const snapshot = { posts: [{ id: 41, categoryIds: [77], coverFileId: 'cloud://cover-41' }, { id: 42, categoryIds: [8] }], totalPosts: 2 }
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async () => { throw new Error('不应访问 WordPress') },
    storage: { getTempFileURL: async () => ({ fileList: [{ fileID: 'cloud://cover-41', tempFileURL: 'https://cdn.example.com/cover-41' }] }) }
  })
  const result = await handler({ page: 1, pageSize: 10, categoryId: 77 })
  assert.equal(result.ok, true)
  assert.deepEqual(result.data.posts.map((post) => post.id), [41])
  assert.equal(result.data.posts[0].featuredImage, 'https://cdn.example.com/cover-41')
  assert.equal(result.data.hasMore, false)
})

test('云存储临时地址缺失或封面尚未上传时回退到快照源图', async () => {
  const snapshot = {
    posts: [
      { id: 61, categoryIds: [79], coverFileId: 'cloud://old-61', sourceImageUrl: 'https://shengxiluo.me/old-61.jpg', featuredImage: '' },
      { id: 62, categoryIds: [79], coverFileId: '', sourceImageUrl: 'https://shengxiluo.me/new-62.jpg', featuredImage: '' }
    ],
    totalPosts: 2
  }
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async () => { throw new Error('不应访问 WordPress') },
    storage: { getTempFileURL: async () => ({ fileList: [{ fileID: 'cloud://old-61', status: -1 }] }) }
  })
  const result = await handler({ page: 1, pageSize: 10, categoryId: 79 })
  assert.equal(result.ok, true)
  assert.deepEqual(result.data.posts.map((post) => post.featuredImage), [
    'https://shengxiluo.me/old-61.jpg', 'https://shengxiluo.me/new-62.jpg'
  ])
})

test('类目页跨出快照时只补读旧文，并保持分页不重复', async () => {
  const snapshot = {
    posts: Array.from({ length: 50 }, (_, index) => ({ id: index + 1, categoryIds: index < 7 ? [7] : [8], publishedAt: `2026-09-${String(30 - Math.floor(index / 2)).padStart(2, '0')}T00:00:00` })),
    totalPosts: 80
  }
  const paths = []
  const handler = createHandler({
    database: () => makeDatabase(snapshot),
    request: async (path) => {
      paths.push(path)
      return { data: [wpPost(51), wpPost(52), wpPost(53)], totalPosts: 10, totalPages: 2 }
    }
  })
  const result = await handler({ page: 2, pageSize: 5, categoryId: 7 })
  assert.deepEqual(result.data.posts.map((post) => post.id), [6, 7, 51, 52, 53])
  assert.equal(result.data.hasMore, true)
  assert.equal(paths.length, 1)
  assert.match(paths[0], /categories=7/)
  assert.match(paths[0], /per_page=3/)
  assert.match(paths[0], /before=2026-09-06T00%3A00%3A01/)
})

test('封面同步分批保存并在下次定时调用续跑，结果包含成功率所需计数', async () => {
  const db = makeDatabase()
  const posts = Array.from({ length: 20 }, (_, index) => ({
    ...wpPost(index + 1), modified: '2026-10-01T00:00:00',
    _embedded: { 'wp:featuredmedia': [{ source_url: `https://shengxiluo.me/${index + 1}.jpg` }] }
  }))
  const uploaded = []
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async (path) => path.startsWith('/categories')
      ? { data: [{ id: 7, name: '摄影' }] }
      : { data: posts, totalPosts: 20 },
    downloadCover: async (url) => ({ bytes: Buffer.from(url), extension: 'jpg' }),
    storage: { uploadFile: async ({ cloudPath }) => { uploaded.push(cloudPath); return { fileID: `cloud://${cloudPath}` } } }
  })
  const first = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(first.ok, true)
  assert.equal(first.data.coverSync.attempted, 16)
  assert.equal(first.data.coverSync.current, 16)
  assert.equal(first.data.coverSync.pending, 4)
  assert.equal(db.stored.posts.filter((post) => post.coverFileId).length, 16)
  assert.deepEqual(db.writes.map((snapshot) => snapshot.posts.filter((post) => post.coverFileId).length), [0, 4, 8, 12, 16])
  const second = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(second.data.coverSync.attempted, 4)
  assert.equal(second.data.coverSync.current, 20)
  assert.equal(second.data.coverSync.pending, 0)
  assert.equal(uploaded.length, 20)
})

test('封面下载失败时旧封面仍可展示，统计区分失败与仍待处理', async () => {
  const old = {
    id: 8, categoryIds: [7], sourceImageUrl: 'https://shengxiluo.me/old.jpg',
    coverModifiedAt: 'old', coverFileId: 'cloud://old', featuredImage: ''
  }
  const db = makeDatabase({ posts: [old], totalPosts: 1 })
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async (path) => path.startsWith('/categories')
      ? { data: [{ id: 7, name: '摄影' }] }
      : { data: [{ ...wpPost(8), modified: 'new', categories: [7], _embedded: { 'wp:featuredmedia': [{ source_url: 'https://shengxiluo.me/new.jpg' }] } }], totalPosts: 1 },
    downloadCover: async () => { throw new Error('封面源不可用') },
    storage: {
      uploadFile: async () => { throw new Error('不应上传') },
      getTempFileURL: async () => ({ fileList: [{ fileID: 'cloud://old', tempFileURL: 'https://cdn.example.com/old' }] })
    }
  })
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    const refreshed = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
    assert.equal(refreshed.data.coverSync.attempted, 1)
    assert.equal(refreshed.data.coverSync.failed, 1)
    assert.equal(refreshed.data.coverSync.covered, 1)
    assert.equal(refreshed.data.coverSync.current, 0)
    assert.equal(refreshed.data.coverSync.pending, 1)
    const list = await handler({ page: 1, pageSize: 3, categoryId: 7 })
    assert.equal(list.data.posts[0].featuredImage, 'https://cdn.example.com/old')
  } finally {
    console.warn = originalWarn
  }
})

test('批次写入中断后保留旧封面和已完成进度，下一轮接着同步', async () => {
  const oldPosts = Array.from({ length: 9 }, (_, index) => ({
    id: index + 1, sourceImageUrl: `https://shengxiluo.me/old-${index + 1}.jpg`,
    coverModifiedAt: 'old', coverFileId: `cloud://old-${index + 1}`, featuredImage: ''
  }))
  const db = makeDatabase({ posts: oldPosts, totalPosts: 9 }, { failOnWrite: [3] })
  const posts = oldPosts.map((post) => ({
    ...wpPost(post.id), modified: 'new',
    _embedded: { 'wp:featuredmedia': [{ source_url: `https://shengxiluo.me/new-${post.id}.jpg` }] }
  }))
  const uploaded = []
  const deleted = []
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async (path) => path.startsWith('/categories') ? { data: [] } : { data: posts, totalPosts: 9 },
    downloadCover: async () => ({ bytes: Buffer.from('jpg'), extension: 'jpg' }),
    storage: {
      uploadFile: async ({ cloudPath }) => {
        const fileID = `cloud://env/${cloudPath}`
        uploaded.push(fileID)
        return { fileID }
      },
      deleteFile: async ({ fileList }) => {
        deleted.push(...fileList)
        return { fileList: fileList.map((fileID) => ({ fileID, status: 0 })) }
      }
    }
  })
  const originalError = console.error
  console.error = () => {}
  try {
    const interrupted = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
    assert.equal(interrupted.ok, false)
    assert.equal(db.stored.coverSync.current, 4)
    assert.equal(db.stored.coverSync.pending, 5)
    assert.ok(db.stored.posts.slice(0, 4).every((post) => post.coverFileId.startsWith('cloud://env/blog/covers/')))
    assert.deepEqual(db.stored.posts.slice(4).map((post) => post.coverFileId), oldPosts.slice(4).map((post) => post.coverFileId))
    assert.deepEqual(deleted.sort(), uploaded.slice(4, 8).sort())
    const resumed = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
    assert.equal(resumed.ok, true)
    assert.equal(resumed.data.coverSync.attempted, 5)
    assert.equal(resumed.data.coverSync.pending, 0)
  } finally {
    console.error = originalError
  }
})

test('定时更新收到异常 WordPress 数据时保留已有快照', async () => {
  const snapshot = { posts: [{ id: 40, title: '仍可展示' }], totalPosts: 1, updatedAtMs: 100 }
  const db = makeDatabase(snapshot)
  const originalError = console.error
  console.error = () => {}
  try {
    const handler = createHandler({ database: () => db, getContext: () => ({}), request: async () => ({ data: { error: 'bad data' }, totalPages: 1 }) })
    const response = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
    assert.equal(response.ok, false)
    assert.deepEqual(db.stored, snapshot)
  } finally {
    console.error = originalError
  }
})

test('旧封面移出快照后先登记七天回收期，过期的后续定时任务才删除', async () => {
  const oldFileId = 'cloud://env/blog/covers/old.jpg'
  const db = makeDatabase({ posts: [{ id: 1, coverFileId: oldFileId }], totalPosts: 1 })
  const deleted = []
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async (path) => path.startsWith('/categories')
      ? { data: [] }
      : { data: [wpPost(2)], totalPosts: 1 },
    storage: { deleteFile: async ({ fileList }) => {
      deleted.push(...fileList)
      return { fileList: fileList.map((fileID) => ({ fileID, status: 0 })) }
    } }
  })
  const first = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(first.ok, true)
  assert.deepEqual(deleted, [])
  assert.equal(db.stored.coverCleanup.length, 1)
  assert.equal(db.stored.coverCleanup[0].fileId, oldFileId)
  assert.ok(db.stored.coverCleanup[0].deleteAfterMs > Date.now() + 6 * 24 * 60 * 60 * 1000)

  db.stored.coverCleanup[0].deleteAfterMs = Date.now() - 1
  const second = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(second.ok, true)
  assert.deepEqual(deleted, [oldFileId])
  assert.deepEqual(db.stored.coverCleanup, [])
})

test('旧封面重新被快照引用或删除失败时保留文件与清理记录', async () => {
  const fileId = 'cloud://env/blog/covers/old.jpg'
  const db = makeDatabase({
    posts: [{ id: 1, coverFileId: fileId }], updatedAtMs: Date.now(),
    coverCleanup: [{ fileId, deleteAfterMs: Date.now() - 1 }]
  })
  let calls = 0
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async () => { throw new Error('快照仍新鲜，不应回源') },
    storage: { deleteFile: async () => { calls += 1; return { fileList: [{ fileID: fileId, status: -1 }] } } }
  })
  const referenced = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(referenced.ok, true)
  assert.equal(calls, 0)
  assert.equal(db.stored.coverCleanup.length, 1)

  db.stored.posts = []
  const failed = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(failed.ok, true)
  assert.equal(calls, 1)
  assert.equal(db.stored.coverCleanup.length, 1)
})

test('旧封面删除期间新增的清理记录不会被旧快照覆盖', async () => {
  const oldFileId = 'cloud://env/blog/covers/old.jpg'
  const newFileId = 'cloud://env/blog/covers/new.jpg'
  const db = makeDatabase({
    posts: [], updatedAtMs: Date.now(),
    coverCleanup: [{ fileId: oldFileId, deleteAfterMs: Date.now() - 1 }]
  })
  const handler = createHandler({
    database: () => db,
    getContext: () => ({}),
    request: async () => { throw new Error('快照仍新鲜，不应回源') },
    storage: { deleteFile: async ({ fileList }) => {
      assert.deepEqual(fileList, [oldFileId])
      db.stored.coverCleanup.push({ fileId: newFileId, deleteAfterMs: Date.now() + 7 * 86400000 })
      return { fileList: [{ fileID: oldFileId, status: 0 }] }
    } }
  })
  const result = await handler({ Type: 'Timer', TriggerName: 'refresh-blog-daily' })
  assert.equal(result.ok, true)
  assert.deepEqual(db.stored.coverCleanup.map((item) => item.fileId), [newFileId])
})
