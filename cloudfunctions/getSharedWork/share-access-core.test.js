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
  const share = { workId: 'work-1', userId: 'owner-1', creationFileId: 'cloud://photo', content: { type: 'poem' }, type: 'poem' }
  const work = { _id: 'work-1', userId: 'owner-1' }
  assert.equal(canReadPublicShare(share, work), false)
  assert.equal(canReadPublicShare({ ...share, safety: { status: 'rejected' } }, work), false)
  assert.equal(canReadPublicShare({ ...share, safety: { status: 'passed' } }, work), false)
  assert.equal(canReadPublicShare({ ...share, safety: { status: 'passed', cardChecked: true } }, work), true)
})

test('作品删除后即使遗漏分享快照也不能再公开读取', () => {
  const { canReadPublicShare } = loadCore()
  const share = {
    workId: 'work-1', userId: 'owner-1', creationFileId: 'cloud://photo',
    content: { type: 'poem' }, type: 'poem', safety: { status: 'passed', cardChecked: true }
  }
  assert.equal(canReadPublicShare(share, null), false)
  assert.equal(canReadPublicShare(share, { _id: 'work-1', userId: 'another-owner' }), false)
  assert.equal(canReadPublicShare(share, { _id: 'work-1', userId: 'owner-1' }), true)
})
