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

test('点击保存分享会打开已就绪的分享成品图浮层', () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    shareImageUrl: 'https://example.com/share-card.jpg'
  })

  page.openSharePanel()

  assert.equal(page.data.sharePanelVisible, true)
  assert.equal(page.data.shareImageUrl, 'https://example.com/share-card.jpg')
})
