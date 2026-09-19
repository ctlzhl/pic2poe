const cloud = require('wx-server-sdk')
const { findUserRecord } = require('./creation-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command
const GENERATE_TYPES = new Set(['poem', 'review', 'copy'])
const MOODS = new Set(['auto', 'warm', 'quiet', 'humorous', 'healing'])
const ACTIVE_STATUSES = ['queued', 'analyzing', 'generating', 'validating']
const TEN_MINUTES_MS = 10 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MAX_CREATIONS_PER_TEN_MINUTES = 4
const MAX_CREATIONS_PER_DAY = 20

const fail = (code, message) => ({ ok: false, code, message })

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const toMilliseconds = (value) => {
  if (value instanceof Date) return value.getTime()
  if (typeof value?.getTime === 'function') return value.getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const consumeCreationQuota = (user, nowMs) => {
  const tenMinuteStartedAt = toMilliseconds(user?.creationTenMinuteStartedAt)
  const dayStartedAt = toMilliseconds(user?.creationDayStartedAt)
  const tenMinuteActive = tenMinuteStartedAt > 0 && nowMs - tenMinuteStartedAt < TEN_MINUTES_MS
  const dayActive = dayStartedAt > 0 && nowMs - dayStartedAt < ONE_DAY_MS
  const tenMinuteCount = tenMinuteActive ? Number(user?.creationTenMinuteCount || 0) : 0
  const dayCount = dayActive ? Number(user?.creationDayCount || 0) : 0

  if (tenMinuteCount >= MAX_CREATIONS_PER_TEN_MINUTES) {
    return { allowed: false, retryAfterSeconds: Math.ceil((TEN_MINUTES_MS - (nowMs - tenMinuteStartedAt)) / 1000) }
  }
  if (dayCount >= MAX_CREATIONS_PER_DAY) {
    return { allowed: false, retryAfterSeconds: Math.ceil((ONE_DAY_MS - (nowMs - dayStartedAt)) / 1000) }
  }

  return {
    allowed: true,
    update: {
      creationTenMinuteStartedAt: tenMinuteActive ? new Date(tenMinuteStartedAt) : new Date(nowMs),
      creationTenMinuteCount: tenMinuteCount + 1,
      creationDayStartedAt: dayActive ? new Date(dayStartedAt) : new Date(nowMs),
      creationDayCount: dayCount + 1,
      lastCreationAt: new Date(nowMs)
    }
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const sourceWorkId = typeof event.sourceWorkId === 'string' ? event.sourceWorkId : ''
  let assetId = typeof event.imageAssetId === 'string' ? event.imageAssetId : ''
  let generateType = typeof event.generateType === 'string' ? event.generateType : ''
  const idempotencyKey = typeof event.idempotencyKey === 'string' ? event.idempotencyKey.slice(0, 80) : ''
  let mood = typeof event.mood === 'string' && MOODS.has(event.mood) ? event.mood : 'auto'
  let location = cleanText(event.location, 60)
  let moment = cleanText(event.moment, 140)

  if (!openid) return fail('UNAUTHORIZED', '请先登录后再开始创作。')
  if (sourceWorkId) {
    try {
      const work = (await db.collection('works').doc(sourceWorkId).get()).data
      if (!work || work.userId !== openid) return fail('WORK_NOT_FOUND', '作品不存在或已失效。')
      const sourceDraft = (await db.collection('creationDrafts').doc(work.draftId).get()).data
      if (!sourceDraft || sourceDraft.userId !== openid) return fail('WORK_NOT_FOUND', '作品创作信息已失效，请换一张照片重试。')
      assetId = sourceDraft.imageAssetId
      generateType = sourceDraft.generateType
      mood = MOODS.has(sourceDraft.mood) ? sourceDraft.mood : 'auto'
      location = cleanText(sourceDraft.location, 60)
      moment = cleanText(sourceDraft.moment, 140)
    } catch (error) {
      console.error('读取同图重写来源失败:', error)
      return fail('WORK_NOT_FOUND', '作品创作信息已失效，请换一张照片重试。')
    }
  }
  if (!assetId) return fail('INVALID_ASSET', '请先上传一张图片。')
  if (!GENERATE_TYPES.has(generateType)) return fail('INVALID_TYPE', '请选择想生成的内容类型。')
  if (!idempotencyKey) return fail('INVALID_REQUEST', '创作请求无效，请重新开始。')

  const draftId = newId('draft')
  const taskId = newId('task')
  const attemptId = newId('attempt')

  try {
    const response = await db.runTransaction(async (transaction) => {
      const duplicate = await transaction.collection('creationTasks')
        .where({ userId: openid, idempotencyKey })
        .limit(1)
        .get()
      if (duplicate.data.length > 0) {
        return { duplicateTask: duplicate.data[0] }
      }

      const active = await transaction.collection('creationTasks')
        .where({ userId: openid, status: command.in(ACTIVE_STATUSES) })
        .limit(1)
        .get()
      if (active.data.length > 0) {
        return { activeTask: active.data[0] }
      }

      const asset = await transaction.collection('imageAssets').doc(assetId).get()
      if (!asset.data || asset.data.userId !== openid || asset.data.status !== 'ready') {
        return { invalidAsset: true }
      }

      const now = db.serverDate()
      const nowMs = Date.now()
      // CloudBase 的 doc(id).get() 在文档不存在时会抛异常。首次创作没有
      // users 文档是正常情况，因此使用 where 查询以获得空数组而非异常。
      const usersByOpenid = await transaction.collection('users')
        .where({ openid })
        .limit(1)
        .get()
      const usersByLegacyId = usersByOpenid.data.length > 0
        ? { data: [] }
        : await transaction.collection('users').where({ userId: openid }).limit(1).get()
      const user = findUserRecord(openid, [...(usersByOpenid.data || []), ...(usersByLegacyId.data || [])])
      const quota = consumeCreationQuota(user, nowMs)
      if (!quota.allowed) return { rateLimited: quota }
      if (user) {
        await transaction.collection('users').doc(user._id).update({ data: { openid, userId: openid, ...quota.update, updatedAt: now } })
      } else {
        await transaction.collection('users').doc(openid).set({
          data: {
            openid,
            ...quota.update,
            updatedAt: now,
            createdAt: now
          }
        })
      }
      await transaction.collection('creationDrafts').doc(draftId).set({
        data: {
          userId: openid,
          imageAssetId: assetId,
          generateType,
          location,
          moment,
          mood,
          createdAt: now,
          updatedAt: now
        }
      })
      await transaction.collection('creationTasks').doc(taskId).set({
        data: {
          draftId,
          userId: openid,
          status: 'queued',
          idempotencyKey,
          attemptId,
          attemptNumber: 1,
          deadlineAt: new Date(Date.now() + 60 * 1000),
          createdAt: now,
          updatedAt: now,
          errorCode: '',
          errorMessage: ''
        }
      })
      await transaction.collection('creationAttempts').doc(attemptId).set({
        data: {
          taskId,
          draftId,
          userId: openid,
          number: 1,
          status: 'queued',
          createdAt: now,
          updatedAt: now
        }
      })
      return { taskId, draftId }
    })

    if (response.duplicateTask) {
      return { ok: true, data: { taskId: response.duplicateTask._id, status: response.duplicateTask.status } }
    }
    if (response.activeTask) {
      return { ok: true, data: { taskId: response.activeTask._id, status: response.activeTask.status } }
    }
    if (response.invalidAsset) return fail('INVALID_ASSET', '图片已失效，请重新上传。')
    if (response.rateLimited) {
      const waitMinutes = Math.max(1, Math.ceil(response.rateLimited.retryAfterSeconds / 60))
      return fail('RATE_LIMITED', `创作次数较多，请约 ${waitMinutes} 分钟后再试。`)
    }
    return { ok: true, data: { taskId: response.taskId, draftId: response.draftId, status: 'queued' } }
  } catch (error) {
    console.error('创建创作任务失败:', error)
    const detail = `${error?.code || ''} ${error?.errCode || ''} ${error?.message || ''} ${error?.errMsg || ''}`
    if (/collection.+not.+exist|DATABASE_COLLECTION_NOT_EXIST/i.test(detail)) {
      return fail('CREATION_COLLECTION_MISSING', '服务配置未完成：创作所需数据库集合不完整。')
    }
    return fail('CREATE_FAILED', '创建创作任务失败，请稍后重试。')
  }
}
