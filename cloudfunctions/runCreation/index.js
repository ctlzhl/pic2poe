const cloud = require('wx-server-sdk')
const { getModelConfig, poemGenerationModel } = require('./model-core')
const { checkImage, checkText } = require('./security-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ACTIVE_STATUSES = new Set(['analyzing', 'generating', 'validating'])
const FAILABLE_STATUSES = new Set(['queued', 'analyzing', 'generating', 'validating'])
const SAFETY_SYSTEM_PROMPT = [
  '你是面向普通用户的中文照片创作助手。',
  '只描述图片中可合理观察到的内容；不得虚构具体人物身份、关系、地点或经历，也不得推断敏感属性。',
  '不得生成色情、暴力美化、违法犯罪指导、仇恨歧视、自伤鼓励或其他可能造成现实伤害的内容。',
  '涉及人脸或儿童时使用中性、尊重且非性化的表达；不得输出住址、学校、联系方式或精确位置。',
  '如果图片或用户输入不适合创作，返回严格 JSON：{"safe":false,"code":"other"}，不要描述敏感细节。'
].join('\n')

const fail = (code, message) => ({ ok: false, code, message })
const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const cleanJson = (value) => {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON 对象')
  return JSON.parse(text.slice(start, end + 1))
}

const extractContent = (payload) => {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((item) => item?.text || item?.content || '').join('')
  throw new Error('模型响应缺少内容')
}

const callChat = async ({ baseUrl, apiKey, model, messages, temperature, maxTokens, timeoutMs }) => {
  if (!baseUrl || !apiKey || !model) throw new Error('模型服务尚未配置')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
        enable_thinking: false
      }),
      signal: controller.signal
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.error) {
      throw new Error(payload?.error?.message || `模型服务返回 ${response.status}`)
    }
    return { content: extractContent(payload), usage: payload.usage || {} }
  } finally {
    clearTimeout(timeout)
  }
}

const assertNotTimedOut = (task) => {
  if (!task.deadlineAt || task.deadlineAt < new Date()) throw new Error('TASK_TIMEOUT')
}

const chineseCharacters = (line) => String(line || '').replace(/[^\u4e00-\u9fff]/g, '')

const validateContent = (type, value) => {
  if (!value || value.type !== type) throw new Error('INVALID_OUTPUT')
  if (type === 'poem') {
    const lines = value.poem?.lines
    if (!Array.isArray(lines) || lines.length !== 4 || lines.some((line) => chineseCharacters(line).length !== 5)) {
      throw new Error('INVALID_OUTPUT')
    }
  }
  if (type === 'review' && (!value.review?.headline || !value.review?.body || !Array.isArray(value.review?.observations))) {
    throw new Error('INVALID_OUTPUT')
  }
  if (type === 'copy' && (!value.copy?.headline || !value.copy?.body || !Array.isArray(value.copy?.hashtags))) {
    throw new Error('INVALID_OUTPUT')
  }
  return value
}

const contentAsText = (value) => JSON.stringify(value || {})

const assertSafeContent = (value) => {
  if (value?.safe === false) throw new Error('SAFETY_REJECTED')
  const content = contentAsText(value)
  // 地点只允许作为私有创作上下文使用；公开分享时由 createShareCard 生成脱敏快照。
  if (/(裸聊|色情服务|自杀方法|制造炸弹|仇恨言论|身份证号|手机号码|家庭住址|具体住址)/.test(content)) {
    throw new Error('SAFETY_REJECTED')
  }
  return { status: 'passed' }
}

const taskError = (error) => {
  const message = error?.message || ''
  if (message === 'TASK_TIMEOUT') return { code: 'TASK_TIMEOUT', message: '这次没有写完，再试一次吧。' }
  if (message === 'INVALID_OUTPUT') return { code: 'INVALID_OUTPUT', message: '这次创作没有完成，请再试一次。' }
  if (message === 'SAFETY_REJECTED' || message === 'CONTENT_REJECTED') return { code: 'CONTENT_REJECTED', message: '内容含违规信息，请更换后重试。' }
  if (message === 'CONTENT_CHECK_UNAVAILABLE') return { code: 'CONTENT_CHECK_UNAVAILABLE', message: '内容校验暂不可用，请稍后重试。' }
  if (message === 'QWEN_CONFIG_MISSING') return { code: 'MODEL_CONFIG_MISSING', message: '图片理解模型尚未配置，请联系管理员完成配置。' }
  if (message.includes('尚未配置')) return { code: 'MODEL_UNAVAILABLE', message: '创作服务暂未准备好，请稍后再试。' }
  if (error?.name === 'AbortError') return { code: 'MODEL_TIMEOUT', message: '这次没有写完，再试一次吧。' }
  return { code: 'MODEL_UNAVAILABLE', message: '创作服务暂时不可用，请稍后再试。' }
}

const updateAttempt = (transaction, attemptId, status, extra = {}) => transaction.collection('creationAttempts').doc(attemptId).update({
  data: { status, updatedAt: db.serverDate(), ...extra }
})

const claimTask = async (taskId, openid) => db.runTransaction(async (transaction) => {
  const taskResult = await transaction.collection('creationTasks').doc(taskId).get()
  const task = taskResult.data
  if (!task || task.userId !== openid) return { missing: true }
  if (task.status !== 'queued') return { alreadyClaimed: true, status: task.status }
  if (!task.deadlineAt || task.deadlineAt < new Date()) return { expired: true, task }

  await transaction.collection('creationTasks').doc(taskId).update({
    data: { status: 'analyzing', updatedAt: db.serverDate() }
  })
  await updateAttempt(transaction, task.attemptId, 'analyzing', {
    startedAt: db.serverDate(),
    promptVersion: getModelConfig().settings.promptVersion,
    safety: { status: 'pending' }
  })
  return { task: { ...task, status: 'analyzing' } }
})

const markFailed = async (task, error) => {
  const publicError = taskError(error)
  await db.runTransaction(async (transaction) => {
    const latestResult = await transaction.collection('creationTasks').doc(task._id).get()
    const latest = latestResult.data
    if (!latest || latest.attemptId !== task.attemptId || !FAILABLE_STATUSES.has(latest.status)) return
    const update = {
      status: 'failed',
      errorCode: publicError.code,
      errorMessage: publicError.message,
      updatedAt: db.serverDate()
    }
    await transaction.collection('creationTasks').doc(task._id).update({ data: update })
    await updateAttempt(transaction, task.attemptId, 'failed', {
      ...update,
      safety: ['SAFETY_REJECTED', 'CONTENT_REJECTED'].includes(error?.message) ? { status: 'rejected' } : undefined,
      finishedAt: db.serverDate()
    })
  })
  return publicError
}

const callWithRetry = async (task, config, callback) => {
  let lastError
  for (let retryCount = 0; retryCount <= config.settings.maxRetries; retryCount += 1) {
    assertNotTimedOut(task)
    try {
      const result = await callback()
      return { ...result, retryCount }
    } catch (error) {
      lastError = error
      if (retryCount >= config.settings.maxRetries || error?.message === 'SAFETY_REJECTED') throw error
    }
  }
  throw lastError
}

const analyzeImage = async (task, asset, draft, config) => {
  if (!config.qwen.apiKey || !config.qwen.baseUrl || !config.qwen.model) {
    throw new Error('QWEN_CONFIG_MISSING')
  }
  const image = await cloud.downloadFile({ fileID: asset.creationFileId })
  const base64 = image.fileContent.toString('base64')
  const instruction = [
    '只描述图片中可见内容，不推断身份、地点、敏感属性或不存在的故事。',
    '仅返回 JSON：{"scene":"","subjects":[],"actions":[],"emotion":"","visualFocus":[]}。',
    draft.location ? `用户填写地点：${draft.location}` : '',
    draft.moment ? `用户补充：${draft.moment}` : ''
  ].filter(Boolean).join('\n')
  const result = await callWithRetry(task, config, () => callChat({
    provider: 'qwen',
    ...config.qwen,
    temperature: config.settings.visionTemperature,
    maxTokens: config.settings.visionMaxTokens,
    timeoutMs: config.settings.requestTimeoutMs,
    messages: [
      { role: 'system', content: SAFETY_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
        ]
      }
    ]
  }))
  const understanding = cleanJson(result.content)
  if (understanding?.safe === false) throw new Error('SAFETY_REJECTED')
  return {
    understanding,
    modelMeta: { provider: 'qwen', model: config.qwen.model, usage: result.usage, retryCount: result.retryCount }
  }
}

const generateContent = async (task, draft, understanding, config) => {
  const context = JSON.stringify({ understanding, location: draft.location, moment: draft.moment, mood: draft.mood })
  if (draft.generateType === 'poem') {
    const model = poemGenerationModel(config)
    const result = await callWithRetry(task, config, () => callChat({
      ...model,
      temperature: config.settings.generationTemperature,
      maxTokens: config.settings.generationMaxTokens,
      timeoutMs: config.settings.requestTimeoutMs,
      messages: [
        { role: 'system', content: SAFETY_SYSTEM_PROMPT },
        { role: 'user', content: `请根据以下照片理解，创作一首五言绝句。以照片中可见的景物、光线或动作立意，写出与画面相称的意境；结合用户补充的信息与所选感觉表达情绪。不要把未经证实的地点、人物关系或故事写成照片事实。

全诗四句，每句恰好五个汉字。认真考虑五言绝句的平仄与押韵，尽量采用通行格律，使第二、四句押韵；写完后自行检查并润色。若严格合律会迫使你凑字、用生硬的词，或损害照片意境与情绪表达，应优先保证内容贴切、语言自然，不必为合律牺牲好诗。标题简洁，呼应全诗。

mood 含义：auto 为顺应画面自然表达，warm 为温暖，quiet 为安静，humorous 为幽默，healing 为治愈。

只返回 JSON，不要附加解释：
{"type":"poem","poem":{"title":"","lines":["","","",""]}}

创作依据：
${context}` }
      ]
    }))
    const content = cleanJson(result.content)
    if (content?.safe === false) throw new Error('SAFETY_REJECTED')
    return {
      content: validateContent('poem', content),
      modelMeta: { provider: 'qwen', model: model.model, usage: result.usage, retryCount: result.retryCount }
    }
  }

  const outputSchema = draft.generateType === 'review'
    ? '{"type":"review","review":{"headline":"","body":"","observations":["",""]}}'
    : '{"type":"copy","copy":{"label":"","headline":"","body":"","hashtags":["",""]}}'
  const userPrompt = draft.generateType === 'review'
    ? `请根据以下照片理解，写一则侧重拍摄技术质量的中文图片点评。重点观察构图与主体安排、光线与明暗、色彩、清晰度和画面层次；只点评照片中确实能看出的要素，挑最值得说的两点，不必逐项套用。既指出有效的拍摄处理，也可以给出具体、温和的改进建议。

不要凭画面猜测相机、镜头、焦距、曝光参数或后期操作；不要虚构拍摄过程、人物身份或地点。标题点出这张照片最鲜明的视觉特点。正文写 40～80 个汉字，observations 填两条简短、具体的观察。

只返回 JSON，不要附加解释：
${outputSchema}

点评依据：
${context}`
    : `请根据以下照片理解，写一段适合与照片一起分享的中文配图文案。以画面可见内容为起点，自然结合用户填写的地点、补充的「这一刻发生了什么」以及所选感觉；不要机械复述输入。地点或补充内容为空时不要自行编造，也不要把用户提供但画面无法验证的信息写成亲眼所见。

mood 含义：auto 为顺应画面自然表达，warm 为温暖，quiet 为安静，humorous 为幽默，healing 为治愈。文字应有具体画面感，语气贴合所选感觉，简洁、自然，避免空泛感叹和夸张营销语。headline 用一句话抓住这一刻；body 可稍作展开；hashtags 只写与内容确实相关的标签。

只返回 JSON，不要附加解释：
${outputSchema}

创作依据：
${context}`
  const result = await callWithRetry(task, config, () => callChat({
    ...config.qwen,
    temperature: config.settings.generationTemperature,
    maxTokens: config.settings.generationMaxTokens,
    timeoutMs: config.settings.requestTimeoutMs,
    messages: [
      { role: 'system', content: SAFETY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  }))
  const content = cleanJson(result.content)
  if (content?.safe === false) throw new Error('SAFETY_REJECTED')
  return {
    content: validateContent(draft.generateType, content),
    modelMeta: { provider: 'qwen', model: config.qwen.model, usage: result.usage, retryCount: result.retryCount }
  }
}

const findReusableUnderstanding = async (draftId, openid) => {
  const attempts = await db.collection('creationAttempts')
    .where({ draftId, userId: openid })
    .limit(10)
    .get()
  return (attempts.data || [])
    .filter((attempt) => attempt.photoUnderstanding && typeof attempt.photoUnderstanding === 'object')
    .sort((left, right) => Number(right.number || 0) - Number(left.number || 0))[0] || null
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext() || {}
  let openid = wxContext.OPENID
  let taskId = typeof event.taskId === 'string' ? event.taskId : ''
  if (!openid) {
    const queued = await db.collection('creationTasks').where({ status: 'queued' }).limit(1).get()
    const task = queued.data[0]
    if (!task) return { ok: true, data: { status: 'idle' } }
    taskId = task._id
    openid = task.userId
  }
  if (!taskId) return fail('INVALID_TASK', '创作任务无效，请重新开始。')

  const claim = await claimTask(taskId, openid)
  if (claim.missing) return fail('TASK_NOT_FOUND', '创作任务不存在或已失效。')
  if (claim.alreadyClaimed) return { ok: true, data: { taskId, status: claim.status } }
  if (claim.expired) {
    const error = await markFailed(claim.task, new Error('TASK_TIMEOUT'))
    return fail(error.code, error.message)
  }

  const task = claim.task
  const startedAtMs = Date.now()
  try {
    const draftResult = await db.collection('creationDrafts').doc(task.draftId).get()
    const draft = draftResult.data
    const assetResult = await db.collection('imageAssets').doc(draft?.imageAssetId).get()
    const asset = assetResult.data
    if (!draft || draft.userId !== openid || !asset || asset.userId !== openid || asset.status !== 'ready') {
      throw new Error('INVALID_OUTPUT')
    }
    if (asset.safety?.status !== 'passed') {
      if (!asset.thumbnailFileId) throw new Error('CONTENT_CHECK_UNAVAILABLE')
      const thumbnail = await cloud.downloadFile({ fileID: asset.thumbnailFileId })
      await checkImage(cloud, thumbnail.fileContent)
      await db.collection('imageAssets').doc(asset._id).update({
        data: { safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() }, updatedAt: db.serverDate() }
      })
    }
    if (draft.safety?.status !== 'passed') {
      await checkText(cloud, [draft.location, draft.moment].filter(Boolean).join('\n'), openid)
      await db.collection('creationDrafts').doc(draft._id).update({
        data: { safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() }, updatedAt: db.serverDate() }
      })
    }
    assertNotTimedOut(task)
    const config = getModelConfig()
    const reusableAnalysis = await findReusableUnderstanding(task.draftId, openid)
    const analysis = reusableAnalysis
      ? { understanding: reusableAnalysis.photoUnderstanding, reused: true, modelMeta: reusableAnalysis.modelMeta?.analysis || null }
      : await analyzeImage(task, asset, draft, config)
    assertNotTimedOut(task)

    await db.runTransaction(async (transaction) => {
      const latestResult = await transaction.collection('creationTasks').doc(task._id).get()
      const latest = latestResult.data
      if (!latest || latest.attemptId !== task.attemptId || latest.status !== 'analyzing' || latest.deadlineAt < new Date()) {
        throw new Error('TASK_TIMEOUT')
      }
      await transaction.collection('creationTasks').doc(task._id).update({ data: { status: 'generating', updatedAt: db.serverDate() } })
      await updateAttempt(transaction, task.attemptId, 'generating', {
        photoUnderstanding: analysis.understanding,
        reusedPhotoUnderstanding: Boolean(analysis.reused),
        modelMeta: analysis.modelMeta ? { analysis: analysis.modelMeta } : undefined
      })
    })

    const generated = await generateContent(task, draft, analysis.understanding, config)
    const safety = assertSafeContent(generated.content)
    await checkText(cloud, contentAsText(generated.content), openid)
    assertNotTimedOut(task)
    const workId = newId('work')

    await db.runTransaction(async (transaction) => {
      const latestResult = await transaction.collection('creationTasks').doc(task._id).get()
      const latest = latestResult.data
      if (!latest || latest.attemptId !== task.attemptId || latest.status !== 'generating' || latest.deadlineAt < new Date()) {
        throw new Error('TASK_TIMEOUT')
      }
      await transaction.collection('creationTasks').doc(task._id).update({
        data: { status: 'validating', updatedAt: db.serverDate() }
      })
      await updateAttempt(transaction, task.attemptId, 'validating')
      await transaction.collection('works').doc(workId).set({
        data: {
          userId: openid,
          draftId: draft._id,
          imageAssetId: asset._id,
          type: draft.generateType,
          content: generated.content,
          safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() },
          createdAt: db.serverDate()
        }
      })
      await transaction.collection('imageAssets').doc(asset._id).update({ data: { workId, updatedAt: db.serverDate() } })
      await transaction.collection('creationTasks').doc(task._id).update({
        data: { status: 'succeeded', workId, updatedAt: db.serverDate() }
      })
      await updateAttempt(transaction, task.attemptId, 'succeeded', {
        modelMeta: {
          analysis: analysis.modelMeta,
          generation: generated.modelMeta,
          promptVersion: config.settings.promptVersion,
          config: {
            requestTimeoutMs: config.settings.requestTimeoutMs,
            maxRetries: config.settings.maxRetries,
            visionTemperature: config.settings.visionTemperature,
            generationTemperature: config.settings.generationTemperature
          }
        },
        safety,
        durationMs: Date.now() - startedAtMs,
        finishedAt: db.serverDate()
      })
    })
    return { ok: true, data: { taskId, status: 'succeeded', workId } }
  } catch (error) {
    console.error('执行创作任务失败:', taskId, error?.message || error)
    const publicError = await markFailed(task, error)
    return fail(publicError.code, publicError.message)
  }
}
