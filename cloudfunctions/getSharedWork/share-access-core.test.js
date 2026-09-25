const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./share-access-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('公开分享只返回已通过微信内容检测的快照', () => {
  const { canReadPublicShare } = loadCore()
  assert.equal(typeof canReadPublicShare, 'function')
  const share = { creationFileId: 'cloud://photo', content: { type: 'poem' }, type: 'poem' }
  assert.equal(canReadPublicShare(share), false)
  assert.equal(canReadPublicShare({ ...share, safety: { status: 'rejected' } }), false)
  assert.equal(canReadPublicShare({ ...share, safety: { status: 'passed' } }), true)
})
