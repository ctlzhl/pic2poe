const resultCode = (value) => Number(value?.errCode ?? value?.errcode)

const checkResult = (response, requiresSuggestion) => {
  const code = resultCode(response)
  if (code === 87014) throw new Error('CONTENT_REJECTED')
  if (code !== 0) throw new Error('CONTENT_CHECK_UNAVAILABLE')
  if (['risky', 'review', 'block'].includes(response?.result?.suggest)) throw new Error('CONTENT_REJECTED')
  if (response?.result?.suggest && response.result.suggest !== 'pass') throw new Error('CONTENT_CHECK_UNAVAILABLE')
  if (!requiresSuggestion) return
  const suggest = response?.result?.suggest
  if (suggest === 'pass') return
  throw new Error('CONTENT_CHECK_UNAVAILABLE')
}

const checkedCall = async (operation, requiresSuggestion) => {
  try {
    checkResult(await operation(), requiresSuggestion)
  } catch (error) {
    if (error?.message === 'CONTENT_REJECTED' || error?.message === 'CONTENT_CHECK_UNAVAILABLE') throw error
    if (resultCode(error) === 87014) throw new Error('CONTENT_REJECTED')
    console.warn('微信内容安全接口调用失败:', resultCode(error) || error?.code || 'UNKNOWN')
    throw new Error('CONTENT_CHECK_UNAVAILABLE')
  }
}

const checkImage = async (cloud, jpeg) => {
  if (!Buffer.isBuffer(jpeg) || !jpeg.length || jpeg.length > 1024 * 1024) {
    throw new Error('CONTENT_CHECK_UNAVAILABLE')
  }
  return checkedCall(() => cloud.openapi.security.imgSecCheck({
    media: { contentType: 'image/jpeg', value: jpeg }
  }), false)
}

const checkText = async (cloud, content, openid) => {
  const text = String(content || '').trim()
  if (!text) return
  if (!openid) throw new Error('CONTENT_CHECK_UNAVAILABLE')
  return checkedCall(() => cloud.openapi.security.msgSecCheck({
    content: text,
    version: 2,
    scene: 4,
    openid
  }), true)
}

module.exports = { checkImage, checkText }
