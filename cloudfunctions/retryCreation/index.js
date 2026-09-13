const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_ATTEMPTS_PER_TASK = 3

const fail = (code, message) => ({ ok: false, code, message })
const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const taskId = typeof event.taskId === 'string' ? event.taskId : ''

  if (!openid) return fail('UNAUTHORIZED', '请先登录后再重试。')
  if (!taskId) return fail('INVALID_TASK', '创作任务无效，请重新开始。')

  const newAttemptId = newId('attempt')

  try {
    const result = await db.runTransaction(async (transaction) => {
      const taskResult = await transaction.collection('creationTasks').doc(taskId).get()
      const task = taskResult.data
      if (!task || task.userId !== openid) return { notFound: true }
      if (task.status !== 'failed') return { notRetryable: true, status: task.status }

      const draftResult = await transaction.collection('creationDrafts').doc(task.draftId).get()
      const draft = draftResult.data
      if (!draft || draft.userId !== openid) return { notFound: true }
      const assetResult = await transaction.collection('imageAssets').doc(draft.imageAssetId).get()
      if (!assetResult.data || assetResult.data.userId !== openid || assetResult.data.status !== 'ready') {
        return { expiredAsset: true }
      }

      const nextNumber = Number(task.attemptNumber || 1) + 1
      if (nextNumber > MAX_ATTEMPTS_PER_TASK) return { retryLimitReached: true }
      const now = db.serverDate()
      await transaction.collection('creationTasks').doc(taskId).update({
        data: {
          status: 'queued',
          attemptId: newAttemptId,
          attemptNumber: nextNumber,
          deadlineAt: new Date(Date.now() + 60 * 1000),
          errorCode: '',
          errorMessage: '',
          updatedAt: now
        }
      })
      await transaction.collection('creationAttempts').doc(newAttemptId).set({
        data: {
          taskId,
          draftId: task.draftId,
          userId: openid,
          number: nextNumber,
          status: 'queued',
          createdAt: now,
          updatedAt: now
        }
      })
      return { nextNumber }
    })

    if (result.notFound) return fail('TASK_NOT_FOUND', '创作任务不存在或已失效。')
    if (result.expiredAsset) return fail('INVALID_ASSET', '图片已过期，请重新上传后再创作。')
    if (result.notRetryable) return fail('NOT_RETRYABLE', '当前任务暂时不能重试。')
    if (result.retryLimitReached) return fail('RETRY_LIMIT_REACHED', '这份作品已尝试 3 次，请换一张照片重新创作。')
    return { ok: true, data: { taskId, status: 'queued', attemptNumber: result.nextNumber } }
  } catch (error) {
    console.error('重试创作任务失败:', error)
    return fail('RETRY_FAILED', '重新生成失败，请稍后重试。')
  }
}
