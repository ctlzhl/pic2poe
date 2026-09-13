const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command

const deleteFiles = async (fileIDs) => {
  const list = fileIDs.filter(Boolean)
  if (list.length === 0) return
  await cloud.deleteFile({ fileList: list })
}

const removeAbandonedDraftData = async (assetId) => {
  const drafts = await db.collection('creationDrafts').where({ imageAssetId: assetId }).get()
  for (const draft of drafts.data) {
    const tasks = await db.collection('creationTasks').where({ draftId: draft._id }).get()
    for (const task of tasks.data) {
      await db.collection('creationAttempts').where({ taskId: task._id }).remove()
      await db.collection('creationTasks').doc(task._id).remove()
    }
    await db.collection('creationDrafts').doc(draft._id).remove()
  }
}

const cleanupRevokedShareCards = async () => {
  const revoked = await db.collection('shareCards').where({ status: 'revoked' }).limit(100).get()
  let removed = 0
  let failures = 0
  for (const share of revoked.data || []) {
    try {
      await deleteFiles([share.fileId, share.creationFileId])
      await db.collection('shareCards').doc(share._id).remove()
      removed += 1
    } catch (error) {
      failures += 1
      console.error('清理已撤销分享图失败:', share._id, error)
    }
  }
  return { removed, failures }
}

exports.main = async () => {
  const now = new Date()
  const expired = await db.collection('imageAssets')
    .where({ expiresAt: command.lt(now) })
    .limit(100)
    .get()

  let originalsRemoved = 0
  let staleAssetsRemoved = 0
  let failures = 0

  for (const asset of expired.data) {
    try {
      if (asset.status === 'ready') {
        if (asset.workId) {
          await deleteFiles([asset.originalFileId])
          await db.collection('imageAssets').doc(asset._id).update({
            data: {
              originalFileId: '',
              originalDeletedAt: db.serverDate(),
              expiresAt: null,
              updatedAt: db.serverDate()
            }
          })
          originalsRemoved += 1
          continue
        }

        await deleteFiles([
          asset.originalFileId,
          asset.creationFileId,
          asset.thumbnailFileId
        ])
        await removeAbandonedDraftData(asset._id)
        await db.collection('imageAssets').doc(asset._id).remove()
        staleAssetsRemoved += 1
        continue
      }

      await deleteFiles([
        asset.stagingFileId,
        asset.originalFileId,
        asset.creationFileId,
        asset.thumbnailFileId
      ])
      await removeAbandonedDraftData(asset._id)
      await db.collection('imageAssets').doc(asset._id).remove()
      staleAssetsRemoved += 1
    } catch (error) {
      failures += 1
      console.error('清理图片资产失败:', asset._id, error)
      if (asset.status === 'deleting') {
        try {
          await db.collection('imageAssets').doc(asset._id).update({
            data: {
              deleteStatus: 'retrying',
              lastDeleteError: String(error?.message || error).slice(0, 180),
              lastDeleteAttemptAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          })
        } catch (updateError) {
          console.error('记录删除重试状态失败:', asset._id, updateError)
        }
      }
    }
  }

  const revokedShares = await cleanupRevokedShareCards()

  return {
    ok: true,
    originalsRemoved,
    staleAssetsRemoved,
    revokedShareCardsRemoved: revokedShares.removed,
    failures: failures + revokedShares.failures
  }
}
