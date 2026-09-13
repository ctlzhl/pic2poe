const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ACTIVE_STATUSES = new Set(['queued', 'analyzing', 'generating', 'validating'])

const fail = (code, message) => ({ ok: false, code, message })

const toPublicTask = (task) => ({
  taskId: task._id,
  status: task.status,
  draftId: task.draftId,
  attemptNumber: task.attemptNumber || 1,
  errorCode: task.errorCode || '',
  errorMessage: task.errorMessage || '',
  workId: task.workId || '',
  updatedAt: task.updatedAt || task.createdAt || null
})

const expireTaskIfNeeded = async (task) => {
  if (!ACTIVE_STATUSES.has(task.status) || !task.deadlineAt || task.deadlineAt >= new Date()) return task

  return db.runTransaction(async (transaction) => {
    const latestResult = await transaction.collection('creationTasks').doc(task._id).get()
    const latest = latestResult.data
    if (!latest || !ACTIVE_STATUSES.has(latest.status) || !latest.deadlineAt || latest.deadlineAt >= new Date()) {
      return latest || task
    }

    const update = {
      status: 'failed',
      errorCode: 'TASK_TIMEOUT',
      errorMessage: '这次没有写完，再试一次吧。',
      updatedAt: db.serverDate()
    }
    await transaction.collection('creationTasks').doc(latest._id).update({ data: update })
    await transaction.collection('creationAttempts').doc(latest.attemptId).update({ data: update })
    return { ...latest, ...update }
  })
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const taskId = typeof event.taskId === 'string' ? event.taskId : ''

  if (!openid) return fail('UNAUTHORIZED', '请先登录后再查看创作进度。')
  if (!taskId) return fail('INVALID_TASK', '创作任务无效，请重新开始。')

  try {
    const taskResult = await db.collection('creationTasks').doc(taskId).get()
    let task = taskResult.data
    if (!task || task.userId !== openid) return fail('TASK_NOT_FOUND', '创作任务不存在或已失效。')
    task = await expireTaskIfNeeded(task)

    return { ok: true, data: toPublicTask(task) }
  } catch (error) {
    console.error('查询创作任务失败:', error)
    return fail('GET_FAILED', '查询创作进度失败，请稍后重试。')
  }
}
