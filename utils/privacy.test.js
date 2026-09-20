const assert = require('node:assert/strict')
const test = require('node:test')

const loadPrivacy = () => {
  delete require.cache[require.resolve('./privacy')]
  return require('./privacy')
}

test('选图前使用微信标准隐私授权能力', async () => {
  const previousWx = global.wx
  let invoked = false
  global.wx = {
    requirePrivacyAuthorize({ success }) {
      invoked = true
      success()
    }
  }
  try {
    await loadPrivacy().requirePrivacyAuthorization()
    assert.equal(invoked, true)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
