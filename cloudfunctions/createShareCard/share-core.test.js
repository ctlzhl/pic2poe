const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./share-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('逻辑删除中的作品不能再生成分享卡', () => {
  const { canCreateShareForWork } = loadCore()
  assert.equal(typeof canCreateShareForWork, 'function')
  assert.equal(canCreateShareForWork({ userId: 'u', status: 'deleting' }, 'u'), false)
  assert.equal(canCreateShareForWork({ userId: 'u' }, 'u'), true)
})
