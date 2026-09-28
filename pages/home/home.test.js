const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'home.js')

const loadPageDefinition = () => {
  const previous = global.Page
  let definition
  global.Page = (options) => { definition = options }
  delete require.cache[require.resolve(PAGE_PATH)]
  require(PAGE_PATH)
  if (previous === undefined) delete global.Page
  else global.Page = previous
  return definition
}

test('首页启用好友与朋友圈分享，并返回首页分享信息', () => {
  const definition = loadPageDefinition()
  const originalWx = global.wx
  let options
  global.wx = { showShareMenu(value) { options = value } }

  try {
    definition.onLoad.call({ loadLatestPosts() {} })
    assert.deepEqual(options, {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    assert.deepEqual(definition.onShareAppMessage(), {
      title: '照片有话说，把此刻写下来',
      path: '/pages/home/home'
    })
    assert.deepEqual(definition.onShareTimeline(), {
      title: '照片有话说，把此刻写下来'
    })
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

const makePage = (definition) => ({
  data: { ...definition.data },
  setData(update) { Object.assign(this.data, update) }
})

test('首页有本地文章时立即展示，再用云端新文章刷新并保存', async () => {
  const definition = loadPageDefinition()
  const originalWx = global.wx
  const oldPost = { id: 1, title: '旧文章', publishedAt: '2026-09-20T10:00:00' }
  const freshPost = { id: 2, title: '新文章', publishedAt: '2026-09-21T10:00:00' }
  let completeRequest
  let saved
  global.wx = {
    getStorageSync() { return { savedAt: Date.now(), posts: [oldPost] } },
    setStorageSync(key, value) { saved = { key, value } },
    cloud: { callFunction(options) { completeRequest = options.success } }
  }

  try {
    const page = makePage(definition)
    const pending = definition.loadLatestPosts.call(page)
    assert.equal(page.data.posts[0].id, 1)
    assert.equal(page.data.blogLoading, false)
    completeRequest({ result: { ok: true, data: { posts: [freshPost] } } })
    await pending
    assert.equal(page.data.posts[0].id, 2)
    assert.equal(saved.value.posts[0].id, 2)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('后台刷新失败时保留本地文章，不用错误状态盖住列表', async () => {
  const definition = loadPageDefinition()
  const originalWx = global.wx
  const oldPost = { id: 3, title: '可读的旧文章', publishedAt: '2026-09-20T10:00:00' }
  global.wx = {
    getStorageSync() { return { savedAt: Date.now(), posts: [oldPost] } },
    cloud: { callFunction(options) { options.fail(new Error('网络错误')) } }
  }
  const originalError = console.error
  console.error = () => {}
  try {
    const page = makePage(definition)
    await definition.loadLatestPosts.call(page)
    assert.equal(page.data.posts[0].id, 3)
    assert.equal(page.data.blogError, '')
    assert.equal(page.data.blogLoading, false)
  } finally {
    console.error = originalError
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})
