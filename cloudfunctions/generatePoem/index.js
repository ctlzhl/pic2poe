
const cloud = require('wx-server-sdk')
const axios = require('axios')

const MODEL_NAME = 'glm-4.6v-flash'
const THINKING_CONFIG = { type: 'disabled' }

const RESPONSE_LOG_MAX = 3000
const FALLBACK_POEM_TITLE = '拍照成诗'
const STORAGE_PREFIX = 'test'

const stringifyForLog = (payload) => {
  try {
    const json = JSON.stringify(payload)
    if (!json) return ''
    if (json.length > RESPONSE_LOG_MAX) {
      return `${json.slice(0, RESPONSE_LOG_MAX)}...<truncated>`
    }
    return json
  } catch (error) {
    console.error('序列化日志字段失败:', error)
    return '[无法序列化日志数据]'
  }
}

const normalizeMessageContent = (content) => {
  if (!content) return ''
  if (typeof content === 'string') {
    return content.trim()
  }
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (!item) return ''
        if (typeof item === 'string') return item
        if (typeof item.text === 'string') return item.text
        if (typeof item.content === 'string') return item.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text.trim()
    if (typeof content.content === 'string') return content.content.trim()
  }
  return ''
}

const stripMarkdownCodeFence = (text = '') => {
  if (typeof text !== 'string') return ''
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) {
    return text
  }
  const firstLineBreakIndex = trimmed.indexOf('\n')
  if (firstLineBreakIndex === -1) {
    return ''
  }
  const contentWithoutFenceIndicator = trimmed.slice(firstLineBreakIndex + 1)
  const closingFenceIndex = contentWithoutFenceIndicator.lastIndexOf('```')
  if (closingFenceIndex === -1) {
    return contentWithoutFenceIndicator.trim()
  }
  return contentWithoutFenceIndicator.slice(0, closingFenceIndex).trim()
}

const stripThinkingTags = (text = '') => {
  if (typeof text !== 'string') return ''

  const boxMatch = text.match(/<\|begin_of_box\|>([\s\S]*?)<\|end_of_box\|>/)
  if (boxMatch && boxMatch[1]) {
    return boxMatch[1].trim()
  }

  const withoutThought = text.replace(/<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/g, '')
  return withoutThought.trim()
}

const extractJsonObjectString = (text = '') => {
  if (typeof text !== 'string') return ''
  const cleaned = stripThinkingTags(text)
  const candidate = stripMarkdownCodeFence(cleaned).trim()
  if (!candidate) return ''
  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    return candidate
  }
  const firstBraceIndex = candidate.indexOf('{')
  const lastBraceIndex = candidate.lastIndexOf('}')
  if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    return candidate.slice(firstBraceIndex, lastBraceIndex + 1)
  }
  return ''
}

const transformModelOutputToPoemPayload = (rawOutput) => {
  if (!rawOutput) {
    return rawOutput
  }

  if (typeof rawOutput === 'object' && !Array.isArray(rawOutput) && rawOutput.title && rawOutput.body) {
    return rawOutput
  }

  if (typeof rawOutput !== 'string') {
    return rawOutput
  }

  const jsonCandidate = extractJsonObjectString(rawOutput)
  if (!jsonCandidate) {
    return rawOutput
  }

  try {
    const parsed = JSON.parse(jsonCandidate)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return rawOutput
    }

    const poemLines = Array.isArray(parsed.poem_lines)
      ? parsed.poem_lines
          .map(line => (typeof line === 'string' ? line.replace(/\s+/g, '').trim() : ''))
          .filter(Boolean)
      : []

    const derivedBody =
      poemLines.length > 0
        ? poemLines.join('\n')
        : (typeof parsed.body === 'string' ? parsed.body.trim() : '')

    const derivedTitle = (typeof parsed.title === 'string' ? parsed.title : '')
      .replace(/\s+/g, '')
      .trim() || FALLBACK_POEM_TITLE

    const imagerySummary =
      typeof parsed.imagery_summary === 'string' ? parsed.imagery_summary.trim() : ''

    const complianceReport =
      parsed.compliance_report && typeof parsed.compliance_report === 'object'
        ? parsed.compliance_report
        : null

    const safetyWarnings = Array.isArray(parsed.safety_warnings)
      ? parsed.safety_warnings
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : []

    const structuredPayload = {
      title: derivedTitle,
      body: derivedBody,
      lines: poemLines,
      imagerySummary,
      complianceReport,
      safetyWarnings,
      structuredSource: parsed
    }

    console.log(
      '结构化诗歌解析成功:',
      stringifyForLog({
        title: structuredPayload.title,
        lineCount: structuredPayload.lines.length,
        hasImagerySummary: Boolean(structuredPayload.imagerySummary),
        hasComplianceReport: Boolean(structuredPayload.complianceReport),
        safetyWarningsCount: structuredPayload.safetyWarnings.length
      })
    )

    if (safetyWarnings.length > 0) {
      console.warn('模型返回的风险提示:', stringifyForLog(safetyWarnings))
    }

    return structuredPayload
  } catch (error) {
    console.warn('解析结构化诗歌JSON失败:', error?.message || error)
    return rawOutput
  }
}

const getRequestIdFromResponse = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return ''
  if (payload.requestId) return payload.requestId
  if (payload.data && payload.data.requestId) return payload.data.requestId
  return ''
}

const extractPoemFromResponse = (responseData = {}) => {
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
    const preview = typeof responseData === 'string'
      ? responseData.slice(0, RESPONSE_LOG_MAX)
      : stringifyForLog(responseData)
    console.error('AI接口响应不是JSON对象，预览:', preview)
    throw new Error('AI接口响应格式异常：返回的不是JSON对象')
  }

  const pickFromChoices = (choices) => {
    if (!Array.isArray(choices) || choices.length === 0) return ''

    const message = choices[0]?.message || {}
    const primaryContent = normalizeMessageContent(message.content)
    if (primaryContent) {
      return primaryContent
    }

    const reasoningFallback = normalizeMessageContent(message.reasoning_content)
    if (reasoningFallback) {
      console.warn('content 为空，已从 reasoning_content 回退生成内容')
      return reasoningFallback
    }

    return ''
  }

  const pickFromOutputText = (outputText) => {
    if (outputText === undefined || outputText === null) return ''
    return normalizeMessageContent(outputText)
  }

  const directPoem = pickFromChoices(responseData.choices)
  if (directPoem) return directPoem

  const nestedPoem = pickFromChoices(responseData.data?.choices)
  if (nestedPoem) return nestedPoem

  const directOutput = pickFromOutputText(responseData.output)
  if (directOutput) return directOutput

  const nestedOutput = pickFromOutputText(responseData.data?.output)
  if (nestedOutput) return nestedOutput

  const directOutputText = pickFromOutputText(responseData.output_text)
  if (directOutputText) return directOutputText

  const nestedOutputText = pickFromOutputText(responseData.data?.output_text)
  if (nestedOutputText) return nestedOutputText

  throw new Error('AI接口响应格式异常：未找到生成内容')
}

const ensureJsonResponse = (response = {}) => {
  const headers = response.headers || {}
  const contentType = headers['content-type'] || headers['Content-Type'] || ''
  if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('application/json')) {
    const preview = stringifyForLog(response.data ?? response)
    throw new Error(`响应类型异常：期望 application/json，实际 ${contentType || '未知'}` + (preview ? `，预览=${preview}` : ''))
  }
  return response
}

exports.extractPoemFromResponse = extractPoemFromResponse
exports.ensureJsonResponse = ensureJsonResponse

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { fileID, think_mode } = event || {}
  const isThinkMode = think_mode === true || think_mode === 'true' || think_mode === 1 || think_mode === '1'
  const startTime = Date.now()
  console.log('当前存储分区(STORAGE_PREFIX):', STORAGE_PREFIX)
  console.log('Think 模式:', isThinkMode ? 'enabled' : 'disabled')
  
  try {
    console.log('开始处理，图片文件ID:', fileID)
    console.log('云函数启动时间:', new Date(startTime).toISOString())

    // 1. 获取图片临时下载链接
    const getUrlStart = Date.now()
    console.log('尝试获取图片临时URL...')
    console.log('fileID类型:', typeof fileID, '值:', fileID)
    
    // 确保fileID是字符串且非空
    if (!fileID || typeof fileID !== 'string') {
      throw new Error('无效的fileID参数，必须是非空字符串')
    }

    const fileResult = await cloud.getTempFileURL({
      fileList: [{
        fileID: fileID,
        maxAge: 60 * 60 // 1小时有效期
      }]
    })
    console.log(`获取图片URL耗时: ${Date.now() - getUrlStart}ms`)

    // 2. 校验图片临时链接，直接交给智谱AI使用
    const prepareImageStart = Date.now()
    console.log('校验图片临时URL供AI调用...')
    const tempFileInfo = fileResult.fileList && fileResult.fileList[0]
    if (!tempFileInfo) {
      throw new Error('获取图片URL失败：未返回任何文件信息')
    }
    if (tempFileInfo.status !== 0) {
      throw new Error(`获取图片URL失败：status=${tempFileInfo.status} errMsg=${tempFileInfo.errMsg || '未知错误'}`)
    }
    const tempFileURL = tempFileInfo.tempFileURL
    if (!tempFileURL) {
      throw new Error('获取图片URL失败：未返回有效的临时链接')
    }
    if (!tempFileURL.includes('?sign=')) {
      console.warn('图片临时URL缺少签名参数，后续访问可能失败')
    }
    const sanitizedUrlForLog = tempFileURL.replace(/(sign=)[^&]+/i, '$1***')
    console.log('图片临时URL（带签名，日志已脱敏）:', sanitizedUrlForLog)
    console.log(`临时URL准备耗时: ${Date.now() - prepareImageStart}ms`)

    // 3. 调用智谱AI生成诗歌
    const aiStart = Date.now()
    console.log('开始调用智谱AI模型:', MODEL_NAME, '...')
    // 详细调试信息
    console.log('ZHIPU_API_KEY:', process.env.ZHIPU_API_KEY ? '已设置' : '未设置')
    if (process.env.ZHIPU_API_KEY) {
      console.log('密钥长度:', process.env.ZHIPU_API_KEY.length)
      console.log('密钥前5位:', process.env.ZHIPU_API_KEY.slice(0, 5))
      console.log('密钥后5位:', process.env.ZHIPU_API_KEY.slice(-5))
    }
    
    const systemPrompt = [
      '【绝对约束】仅输出一个可直接解析的 JSON 对象，禁止添加 Markdown、解释或任何附加字符；如判断 token 可能不足，请立刻停止思考并优先完成该 JSON。',
      '【角色定位】你是资深的多模态古典诗歌撰写人，能够精准解读图像意象并以严谨格律创作五言绝句。',
      '【任务目标】结合输入图片与用户补充文字，产出兼具画面感与格律规范的五言绝句，并返回结构化 JSON。',
      '【输入要素】',
      'A. 图片：由 image_url 指向的单张图像，可能包含风景、人文或静物；',
      'B. 用户补充（非必需）：一段最多数十字的中文指示，描述情绪、主题或额外要求。',
      '【创作规则】',
      '1. 体裁固定为五言绝句，严格四句，每句五个汉字，不得增减字数；',
      '2. 标题需 2-8 个汉字，占独立一行，不含标点、数字或括号，且与诗句不完全相同；',
      '3. 前两句重在描摹画面与气韵，后两句可转入情感或哲理，但必须保持含蓄、典雅、古语化；',
      '4. 用词避免现代口语、阿拉伯数字、emoji、拼音或英语；',
      '5. 必须结合图片显著元素（景物、色彩、季节、光影、人物状态等），不可空泛；',
      '6. 如发现潜在违规或无法生成合规诗句，仍需给出最接近期望的草稿，并将原因写入 safety_warnings。',
      '【输出字段】严格包含以下键：',
      '- title：string，2-8 个汉字的纯文本标题；',
      '- poem_lines：string[4]，每项为 5 个汉字且不含标点或序号；',
      '- imagery_summary：string，≤25 字，以古典语言概述画面；',
      '- compliance_report：object，形如 {"meter":"五言绝句","rhyme":"<押韵>","constraints_respected":true/false,"violations":["<若有请列出>"]}；',
      '- safety_warnings：string[]，无问题则返回空数组。',
      '【校验要求】若 safety_warnings 非空，必须在 compliance_report.violations 中同步说明，并始终确保 JSON 可直接解析。'
    ].join('\n')

    const userPrompt = [
      '请结合图片内容与上方系统规约，只返回一个 JSON（严禁 Markdown 或额外解释）；若存在合规疑虑，也必须先输出 JSON 并在 safety_warnings 及 compliance_report.violations 说明。',
      '示例结构：{"title":"云岫松声","poem_lines":["松声入画轴","云气染晴岚","远橹分溪影","轻舟带暮寒"],"imagery_summary":"青松暮岚与轻舟交织的山水意境","compliance_report":{"meter":"五言绝句","rhyme":"寒韵","constraints_respected":true,"violations":[]},"safety_warnings":[]}'
    ].join('\n')

    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: tempFileURL
          }
        },
        {
          type: 'text',
          text: userPrompt
        }
      ]
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      userMessage
    ]

    const logSafeMessages = messages.map(message => {
      if (message.role !== 'user') {
        return message
      }
      if (!Array.isArray(message.content)) {
        return message
      }
      const logSafeContent = message.content.map(contentItem => {
        if (!contentItem || contentItem.type !== 'image_url') {
          return contentItem
        }
        return {
          ...contentItem,
          image_url: {
            url: sanitizedUrlForLog
          }
        }
      })
      return {
        ...message,
        content: logSafeContent
      }
    })

    const requestPayload = {
      model: MODEL_NAME,
      messages,
      temperature: 0.8,
      max_tokens: 1536,
      thinking: isThinkMode ? { type: 'enabled' } : THINKING_CONFIG
    }
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
    }
    const payloadForLog = {
      ...requestPayload,
      messages: logSafeMessages
    }
    console.log('请求载荷:', stringifyForLog(payloadForLog))

    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      requestPayload,
      {
        headers: requestHeaders,
        timeout: 20000 // 20秒超时
      }
    )

    console.log('AI接口原始响应:', stringifyForLog(response.data))
    const requestId = getRequestIdFromResponse(response.data)
    if (requestId) {
      console.log('AI请求ID:', requestId)
    }

    if (response.data?.error) {
      const { code, type, message: apiMessage } = response.data.error
      const prefix = code ? `code=${code}` : (type ? `type=${type}` : '')
      const errorDetail = apiMessage || '未知错误'
      throw new Error(prefix ? `AI接口错误（${prefix}）：${errorDetail}` : `AI接口错误：${errorDetail}`)
    }

    const responseCode = response.data?.code
    if (responseCode !== undefined && responseCode !== 0 && responseCode !== '0') {
      const msg = response.data?.msg || '未知错误'
      throw new Error(`AI接口业务失败（code=${responseCode}）：${msg}`)
    }

    const poem = extractPoemFromResponse(response.data)
    const poemPayload = transformModelOutputToPoemPayload(poem)
    console.log(`AI调用完成，耗时: ${Date.now() - aiStart}ms`)
    console.log('生成的诗歌（原始文本）:', poem)
    if (poemPayload && typeof poemPayload === 'object' && !Array.isArray(poemPayload)) {
      console.log(
        '生成的诗歌（结构化对象）:',
        stringifyForLog({
          title: poemPayload.title,
          lines: poemPayload.lines,
          imagerySummary: poemPayload.imagerySummary,
          safetyWarnings: poemPayload.safetyWarnings
        })
      )
    }

    // 4. 返回结果
    console.log(`云函数总耗时: ${Date.now() - startTime}ms`)
    return {
      code: 0,
      message: 'success',
      data: {
        poem: poemPayload,
        imageUrl: tempFileURL
      }
    }
  } catch (err) {
    if (err.response) {
      console.error('AI接口响应状态码:', err.response.status)
      console.error('AI接口响应头:', err.response.headers)
      console.error('AI接口响应体:', stringifyForLog(err.response.data))
      const failedRequestId = getRequestIdFromResponse(err.response.data)
      if (failedRequestId) {
        console.error('AI请求ID:', failedRequestId)
      }
    } else if (err.request) {
      console.error('AI接口未返回响应，请求信息:', err.request)
    }
    console.error('云函数执行错误:', err)
    console.log(`云函数失败总耗时: ${Date.now() - startTime}ms`)
    const fallbackMsg = err.response?.data?.msg || err.message || '未知错误'
    const requestIdForClient = err.response?.data && getRequestIdFromResponse(err.response.data)
    const userFacingMsg = requestIdForClient
      ? `诗歌生成失败（请求ID: ${requestIdForClient}）：${fallbackMsg}`
      : `诗歌生成失败：${fallbackMsg}`

    return {
      code: -1,
      message: userFacingMsg,
      data: null
    }
  }
}