const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./profile-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('normalizeProfile 只接受安全的微信昵称和 HTTPS 头像', () => {
  const { normalizeProfile } = loadCore()
  assert.equal(typeof normalizeProfile, 'function')

  assert.deepEqual(normalizeProfile({ nickName: '  小照  ', avatarUrl: 'https://wx.qlogo.cn/avatar.png' }), {
    nickName: '小照',
    avatarUrl: 'https://wx.qlogo.cn/avatar.png'
  })
  assert.equal(normalizeProfile({ nickName: '', avatarUrl: 'http://unsafe.example/avatar.png' }), null)
})
