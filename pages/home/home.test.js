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
