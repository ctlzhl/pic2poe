const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command
const ACTIVE_STATUSES = ['queued', 'analyzing', 'generating', 'validating']

exports.main = async () => {
  const now = new Date()
  const expired = await db.collection('creationTasks')
    .where({ status: command.in(ACTIVE_STATUSES), deadlineAt: command.lt(now) })
    .limit(100)
    .get()

  let recovered = 0
  for (const task of expired.data) {
    const changed = await db.runTransaction(async (transaction) => {
      const current = await transaction.collection('creationTasks').doc(task._id).get()
      const latest = current.data
      if (!latest || !ACTIVE_STATUSES.includes(latest.status) || !latest.deadlineAt || latest.deadlineAt >= now) {
        return false
      }

      await transaction.collection('creationTasks').doc(task._id).update({
        data: {
          status: 'failed',
          errorCode: 'TASK_TIMEOUT',
          errorMessage: '这次没有写完，再试一次吧。',
          updatedAt: db.serverDate()
        }
      })
      await transaction.collection('creationAttempts').doc(latest.attemptId).update({
        data: {
          status: 'failed',
          errorCode: 'TASK_TIMEOUT',
          errorMessage: '这次没有写完，再试一次吧。',
          updatedAt: db.serverDate()
        }
      })
      return true
    })
    if (changed) recovered += 1
  }

  return { ok: true, recovered }
}
