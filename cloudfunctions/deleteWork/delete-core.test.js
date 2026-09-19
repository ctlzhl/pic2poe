const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./delete-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('共享图片资产在仍有其他作品引用时不能删除', () => {
  const { shouldDeleteAsset, findRemainingWork, shareFileIdsForDeletion } = loadCore()
  assert.equal(typeof shouldDeleteAsset, 'function')
  assert.equal(typeof findRemainingWork, 'function')
  assert.equal(typeof shareFileIdsForDeletion, 'function')

  assert.equal(shouldDeleteAsset('work-a', [{ _id: 'work-a' }, { _id: 'work-b' }]), false)
  assert.equal(shouldDeleteAsset('work-a', [{ _id: 'work-a' }]), true)
  assert.deepEqual(findRemainingWork('work-a', [{ _id: 'work-a' }, { _id: 'work-b' }]), { _id: 'work-b' })
})

test('删除共享图片资产的一份作品时只删除分享成品图', () => {
  const { shareFileIdsForDeletion } = loadCore()
  const shares = [{ fileId: 'cloud://share-a.jpg', creationFileId: 'cloud://creation.jpg' }]

  assert.deepEqual(shareFileIdsForDeletion(shares), ['cloud://share-a.jpg'])
})
