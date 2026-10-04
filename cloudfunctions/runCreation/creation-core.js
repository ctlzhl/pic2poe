const MODEL_FINISH_RESERVE_MS = 5000
const MIN_MODEL_REQUEST_MS = 3000

const validText = (value, maxLength) => typeof value === 'string' && Boolean(value.trim()) && value.length <= maxLength
const validTexts = (value, maxItems, maxLength) => Array.isArray(value) && value.length <= maxItems &&
  value.every((item) => validText(item, maxLength))

const validateContent = (type, value) => {
  if (!value || value.type !== type) throw new Error('INVALID_OUTPUT')
  if (type === 'poem') {
    const poem = value.poem
    if (!validText(poem?.title, 80) || !Array.isArray(poem?.lines) || poem.lines.length !== 4 ||
      poem.lines.some((line) => typeof line !== 'string' || !/^[\u4e00-\u9fff]{5}[，。！？]?$/u.test(line.trim()))) {
      throw new Error('INVALID_OUTPUT')
    }
  } else if (type === 'review') {
    const review = value.review
    if (!validText(review?.headline, 120) || !validText(review?.body, 1000) ||
      !validTexts(review?.observations, 10, 120)) throw new Error('INVALID_OUTPUT')
  } else if (type === 'copy') {
    const copy = value.copy
    if (!validText(copy?.headline, 120) || !validText(copy?.body, 1000) ||
      !validTexts(copy?.hashtags, 10, 120) ||
      (copy.label !== undefined && typeof copy.label !== 'string')) throw new Error('INVALID_OUTPUT')
  } else {
    throw new Error('INVALID_OUTPUT')
  }
  return value
}

const shouldRetryModelError = (error) => {
  if (['INVALID_OUTPUT', 'MODEL_RESPONSE_INVALID'].includes(error?.message)) return true
  if (error?.name === 'AbortError' || error instanceof TypeError) return true
  return [408, 429].includes(error?.status) || error?.status >= 500
}

const callWithRetry = async (task, settings, callback, now = Date.now) => {
  for (let retryCount = 0; retryCount <= settings.maxRetries; retryCount += 1) {
    const remainingMs = new Date(task.deadlineAt).getTime() - now()
    const timeoutMs = Math.min(settings.requestTimeoutMs, remainingMs - MODEL_FINISH_RESERVE_MS)
    if (!Number.isFinite(timeoutMs) || timeoutMs < MIN_MODEL_REQUEST_MS) throw new Error('TASK_TIMEOUT')
    try {
      return { ...(await callback(timeoutMs, retryCount)), retryCount }
    } catch (error) {
      if (retryCount >= settings.maxRetries || !shouldRetryModelError(error)) throw error
    }
  }
  throw new Error('TASK_TIMEOUT')
}

module.exports = { validateContent, callWithRetry }
