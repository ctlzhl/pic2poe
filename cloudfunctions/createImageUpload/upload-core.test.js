const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./upload-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('暂存路径使用独立前缀以匹配生命周期规则', () => {
  const { createStagingPath } = loadCore()
  assert.equal(typeof createStagingPath, 'function')
  assert.equal(createStagingPath('openid', 'token', 'jpg'), 'staging/openid/token.jpg')
})
