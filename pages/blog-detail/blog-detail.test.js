const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'blog-detail.js')

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

test('文章详情页分享会保留文章入口、标题与头图', () => {
  const definition = loadPageDefinition()
  const originalWx = global.wx
  let shareMenuOptions
  global.wx = { showShareMenu(options) { shareMenuOptions = options } }
  const page = {
    data: {
      ...definition.data,
      post: {
        title: '晚风里的城市灯火',
        featuredImage: 'https://example.com/post-cover.jpg'
      }
    },
    setData(update) { Object.assign(this.data, update) },
    loadPost() {}
  }

  try {
    definition.onLoad.call(page, { postId: 'post 42' })

    assert.deepEqual(shareMenuOptions, {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    assert.equal(page.data.postId, 'post 42')
    assert.deepEqual(definition.onShareAppMessage.call(page), {
      title: '晚风里的城市灯火｜照片有话说',
      path: '/pages/blog-detail/blog-detail?postId=post%2042',
      imageUrl: 'https://example.com/post-cover.jpg'
    })
    assert.deepEqual(definition.onShareTimeline.call(page), {
      title: '晚风里的城市灯火｜照片有话说',
      query: 'postId=post%2042',
      imageUrl: 'https://example.com/post-cover.jpg'
    })
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'blog-detail.json'), 'utf8'))
    assert.equal(config.enableShareTimeline, true)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('文章尚未加载时使用默认分享文案', () => {
  const definition = loadPageDefinition()
  const page = { data: { ...definition.data, postId: '42', post: {} } }

  assert.deepEqual(definition.onShareAppMessage.call(page), {
    title: '随便看看｜照片有话说',
    path: '/pages/blog-detail/blog-detail?postId=42',
    imageUrl: undefined
  })
  assert.deepEqual(definition.onShareTimeline.call(page), {
    title: '随便看看｜照片有话说',
    query: 'postId=42',
    imageUrl: undefined
  })
})
