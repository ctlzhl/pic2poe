const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const fail = (code, message) => ({ ok: false, code, message })

const deleteFiles = async (fileIds) => {
  const unique = [...new Set(fileIds.filter(Boolean))]
  for (let index = 0; index < unique.length; index += 50) {
    await cloud.deleteFile({ fileList: unique.slice(index, index + 50) })
  }
}

const getOwnedDocument = async (collection, id, openid) => {
  try {
    const result = await db.collection(collection).doc(id).get()
    return result.data?.userId === openid ? result.data : null
  } catch (error) {
    return null
  }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  const workId = typeof event.workId === 'string' ? event.workId : ''
  if (!openid) return fail('UNAUTHORIZED', '请先登录后再删除作品。')
  if (!workId) return fail('INVALID_WORK', '作品不存在或已失效。')

  try {
    const work = await getOwnedDocument('works', workId, openid)
    if (!work) return fail('WORK_NOT_FOUND', '作品不存在或已失效。')
    const asset = await getOwnedDocument('imageAssets', work.imageAssetId, openid)
    const sharesResult = await db.collection('shareCards').where({ workId, userId: openid }).limit(100).get()
    const shares = sharesResult.data || []

    await db.runTransaction(async (transaction) => {
      const latestResult = await transaction.collection('works').doc(workId).get()
      const latest = latestResult.data
      if (!latest || latest.userId !== openid) throw new Error('WORK_NOT_FOUND')

      for (const share of shares) {
        // 先撤销令牌，保证后续任何失败都不会让已删除作品继续被公开访问。
        await transaction.collection('shareCards').doc(share._id).update({
          data: { status: 'revoked', revokedAt: db.serverDate(), updatedAt: db.serverDate() }
        })
      }

      const tasksResult = await transaction.collection('creationTasks').where({ draftId: latest.draftId, userId: openid }).get()
      for (const task of tasksResult.data || []) {
        const attemptsResult = await transaction.collection('creationAttempts').where({ taskId: task._id, userId: openid }).get()
        for (const attempt of attemptsResult.data || []) {
          await transaction.collection('creationAttempts').doc(attempt._id).remove()
        }
        await transaction.collection('creationTasks').doc(task._id).remove()
      }

      if (latest.draftId) await transaction.collection('creationDrafts').doc(latest.draftId).remove()
      if (asset) {
        // 文件删除可能是暂时性失败。保留待清理资产让定时任务可以继续回收。
        await transaction.collection('imageAssets').doc(asset._id).update({
          data: {
            status: 'deleting',
            deleteStatus: 'pending',
            deleteRequestedAt: db.serverDate(),
            lastDeleteError: '',
            expiresAt: new Date(Date.now() - 1),
            updatedAt: db.serverDate()
          }
        })
      }
      await transaction.collection('works').doc(workId).remove()
    })

    try {
      await deleteFiles([
        asset?.stagingFileId,
        asset?.originalFileId,
        asset?.creationFileId,
        asset?.thumbnailFileId,
        ...shares.flatMap((share) => [share.fileId, share.creationFileId])
      ])
      await Promise.all([
        ...shares.map((share) => db.collection('shareCards').doc(share._id).remove()),
        ...(asset ? [db.collection('imageAssets').doc(asset._id).remove()] : [])
      ])
    } catch (error) {
      // 分享凭证已撤销；待清理记录由定时清理函数在下一轮继续处理。
      console.warn('删除作品关联文件失败:', error?.message || error)
    }

    return { ok: true, data: { workId } }
  } catch (error) {
    console.error('删除作品失败:', error)
    if (error?.message === 'WORK_NOT_FOUND') return fail('WORK_NOT_FOUND', '作品不存在或已失效。')
    return fail('DELETE_WORK_FAILED', '删除作品失败，请稍后重试。')
  }
}
