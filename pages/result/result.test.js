const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'result.js')

function loadPageDefinition() {
  const originalPage = global.Page
  let definition
  global.Page = (options) => {
    definition = options
  }
  delete require.cache[require.resolve(PAGE_PATH)]
  require(PAGE_PATH)
  if (originalPage === undefined) delete global.Page
  else global.Page = originalPage
  return definition
}

function createPage(definition, data = {}) {
  const page = {
    data: { ...definition.data, ...data },
    setData(update) {
      Object.assign(this.data, update)
    }
  }

  Object.entries(definition).forEach(([name, value]) => {
    if (typeof value === 'function') page[name] = value.bind(page)
  })
  return page
}

test('点击保存分享会直接打开已就绪图片的原生分享菜单', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    shareImageUrl: 'https://example.com/share-card.jpg'
  })
  page.shareImageTempPath = '/tmp/share-card.jpg'
  const originalWx = global.wx
  let shownPath = ''
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showShareImageMenu({ path }) {
      shownPath = path
    }
  }

  try {
    await page.openNativeShareMenu()
    assert.equal(shownPath, '/tmp/share-card.jpg')
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})
