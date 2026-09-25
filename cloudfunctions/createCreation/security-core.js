const resultCode = (value) => Number(value?.errCode ?? value?.errcode)

const checkText = async (cloud, content, openid) => {
  const text = String(content || '').trim()
  if (!text) return
  if (!openid) throw new Error('CONTENT_CHECK_UNAVAILABLE')
  try {
    const response = await cloud.openapi.security.msgSecCheck({
      content: text,
      version: 2,
      scene: 4,
      openid
    })
    if (resultCode(response) === 87014 || ['risky', 'review', 'block'].includes(response?.result?.suggest)) {
      throw new Error('CONTENT_REJECTED')
    }
    if (resultCode(response) !== 0 || response?.result?.suggest !== 'pass') {
      throw new Error('CONTENT_CHECK_UNAVAILABLE')
    }
  } catch (error) {
    if (error?.message === 'CONTENT_REJECTED' || error?.message === 'CONTENT_CHECK_UNAVAILABLE') throw error
    if (resultCode(error) === 87014) throw new Error('CONTENT_REJECTED')
    console.warn('微信文字安全接口调用失败:', resultCode(error) || error?.code || 'UNKNOWN')
    throw new Error('CONTENT_CHECK_UNAVAILABLE')
  }
}

module.exports = { checkText }
