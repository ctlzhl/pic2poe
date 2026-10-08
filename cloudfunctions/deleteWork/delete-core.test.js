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

test('删除作品时分批撤销超过一百条的分享快照', async () => {
  const { revokeReadyShares } = loadCore()
  const ready = Array.from({ length: 205 }, (_, index) => ({ _id: `share-${index}`, status: 'ready' }))
  const revoked = await revokeReadyShares(
    async () => ready.filter((share) => share.status === 'ready').slice(0, 100),
    async (share) => { share.status = 'revoked' }
  )
  assert.equal(revoked.length, 205)
  assert.equal(ready.filter((share) => share.status === 'ready').length, 0)
})

test('分享查询持续返回相同记录时停止重试，避免删除函数超时', async () => {
  const { revokeReadyShares } = loadCore()
  let reads = 0
  await assert.rejects(
    revokeReadyShares(
      async () => {
        reads += 1
        if (reads > 2) throw new Error('fixture should not reach a third read')
        return [{ _id: 'same-share' }]
      },
      async () => {}
    ),
    /SHARE_REVOKE_STALLED/
  )
})
