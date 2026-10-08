const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

test('退出登录只隐藏本机个人资料并返回我的页面', async () => {
  const previousPage = global.Page
  const previousWx = global.wx
  let definition
  let removedKey
  let destination
  global.Page = (options) => { definition = options }
  global.wx = {
    showModal({ success }) { success({ confirm: true }) },
    removeStorageSync(key) { removedKey = key },
    switchTab({ url }) { destination = url }
  }
  try {
    const pagePath = path.join(__dirname, 'settings.js')
    delete require.cache[require.resolve(pagePath)]
    require(pagePath)
    await definition.signOut()
    assert.equal(removedKey, 'profileSignedIn:v1')
    assert.equal(destination, '/pages/my/my')
  } finally {
    if (previousPage === undefined) delete global.Page
    else global.Page = previousPage
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
