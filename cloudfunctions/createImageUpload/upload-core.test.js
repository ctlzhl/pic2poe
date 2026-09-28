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
  const { createStagingPath, createWorkingStagingPath } = loadCore()
  assert.equal(typeof createStagingPath, 'function')
  assert.equal(createStagingPath('openid', 'token', 'jpg'), 'staging/openid/token.jpg')
  assert.equal(createWorkingStagingPath('openid', 'token', 'jpg'), 'staging/openid/token-work.jpg')
})

test('一张图片的原图和工作图拥有不同且可验证的暂存路径', () => {
  const { createUploadPaths } = loadCore()
  assert.equal(typeof createUploadPaths, 'function')
  assert.deepEqual(createUploadPaths('openid', 'token', 'jpeg', 'jpg'), {
    stagingPath: 'staging/openid/token.jpeg',
    workingStagingPath: 'staging/openid/token-work.jpg'
  })
})
