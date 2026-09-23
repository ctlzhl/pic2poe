const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'blog.js')

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

const createPage = (definition) => {
  const page = {
    data: { ...definition.data },
    setData(update) { Object.assign(this.data, update) }
  }
  Object.entries(definition).forEach(([name, value]) => {
    if (typeof value === 'function') page[name] = value.bind(page)
  })
  return page
}

test('切换类目时旧请求的文章不能覆盖新类目', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const requests = []
  global.wx = {
    showShareMenu() {},
    cloud: {
      callFunction({ data, success }) {
        if (data.action === 'categories') return success({ result: { ok: true, data: { categories: [] } } })
        requests.push({ data, success })
      }
    }
  }

  try {
    const page = createPage(definition)
    page.onLoad()
    await Promise.resolve()
    page.selectCategory({ currentTarget: { dataset: { categoryId: 7 } } })
    await Promise.resolve()
    assert.equal(requests.length, 2)

    requests[1].success({ result: { ok: true, data: { posts: [{ id: 7, publishedAt: '2026-01-01' }], hasMore: false } } })
    await Promise.resolve()
    requests[0].success({ result: { ok: true, data: { posts: [{ id: 1, publishedAt: '2026-01-01' }], hasMore: true } } })
    await Promise.resolve()

    assert.equal(page.data.selectedCategoryId, 7)
    assert.deepEqual(page.data.posts.map((post) => post.id), [7])
    assert.equal(page.data.hasMore, false)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('文章列表页启用好友与朋友圈分享，并返回列表入口', () => {
  const definition = loadPageDefinition()
  const originalWx = global.wx
  let shareMenuOptions
  global.wx = { showShareMenu(options) { shareMenuOptions = options } }

  try {
    definition.onLoad.call({
      loadCategories() {},
      loadMore() {},
      requestVersion: 0
    })

    assert.deepEqual(shareMenuOptions, {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    assert.deepEqual(definition.onShareAppMessage(), {
      title: '随便看看｜照片有话说',
      path: '/pages/blog/blog'
    })
    assert.deepEqual(definition.onShareTimeline(), {
      title: '随便看看｜照片有话说'
    })
    const config = JSON.parse(require('node:fs').readFileSync(path.join(__dirname, 'blog.json'), 'utf8'))
    assert.equal(config.enableShareTimeline, true)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})
