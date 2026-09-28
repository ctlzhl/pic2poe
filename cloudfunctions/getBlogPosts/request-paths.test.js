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

const makeDatabase = (initial = null) => {
  let stored = initial
  return {
    get stored() { return stored },
    collection(name) {
      assert.equal(name, 'blogHomeCache')
      return {
        doc(id) {
          assert.equal(id, 'latest-three')
          return {
            async get() {
              if (!stored) throw new Error('document does not exist')
              return { data: stored }
            },
            async set({ data }) { stored = data }
          }
        }
      }
    }
  }
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
  const snapshot = { posts: [{ id: 11, title: '已缓存文章' }], totalPages: 2, updatedAtMs: 100 }
  const db = makeDatabase(snapshot)
  const handler = createHandler({ database: () => db, request: async () => { throw new Error('不应访问 WordPress') } })
  const result = await handler({ page: 1, pageSize: 3 })
  assert.equal(result.ok, true)
  assert.deepEqual(result.data.posts, snapshot.posts)
  assert.equal(result.data.totalPages, 2)
})

test('定时触发更新固定快照，下次首页请求直接读取新文章', async () => {
  assert.equal(typeof createHandler, 'function')
  const db = makeDatabase({ posts: [{ id: 1 }], totalPages: 1 })
  let requests = 0
  const handler = createHandler({
    database: () => db,
    request: async (path) => {
      assert.equal(path, buildListPath({ page: 1, pageSize: 3 }))
      requests += 1
      return { data: [wpPost(21)], totalPages: 4 }
    }
  })
  const refreshed = await handler({ Type: 'Timer', TriggerName: 'refresh-home-blog-every-5-minutes' })
  assert.equal(refreshed.ok, true)
  assert.equal(db.stored.posts[0].id, 21)
  const response = await handler({ page: 1, pageSize: 3 })
  assert.equal(response.data.posts[0].title, '文章 21')
  assert.equal(requests, 1)
})

test('云端快照尚未建立时仍可从 WordPress 返回首页文章并写入快照', async () => {
  assert.equal(typeof createHandler, 'function')
  const db = makeDatabase()
  const handler = createHandler({ database: () => db, request: async () => ({ data: [wpPost(31)], totalPages: 1 }) })
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    const response = await handler({ page: 1, pageSize: 3 })
    assert.equal(response.data.posts[0].id, 31)
    assert.equal(db.stored.posts[0].id, 31)
  } finally {
    console.warn = originalWarn
  }
})

test('定时更新收到异常 WordPress 数据时保留已有快照', async () => {
  const snapshot = { posts: [{ id: 40, title: '仍可展示' }], totalPages: 1, updatedAtMs: 100 }
  const db = makeDatabase(snapshot)
  const originalError = console.error
  console.error = () => {}
  try {
    const handler = createHandler({ database: () => db, request: async () => ({ data: { error: 'bad data' }, totalPages: 1 }) })
    const response = await handler({ Type: 'Timer', TriggerName: 'refresh-home-blog-every-5-minutes' })
    assert.equal(response.ok, false)
    assert.deepEqual(db.stored, snapshot)
  } finally {
    console.error = originalError
  }
})
