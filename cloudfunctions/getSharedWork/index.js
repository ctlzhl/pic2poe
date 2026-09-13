const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,32}$/
const fail = (code, message) => ({ ok: false, code, message })

const getTempUrl = async (fileID) => {
  const result = await cloud.getTempFileURL({ fileList: [fileID] })
  return result.fileList?.[0]?.tempFileURL || ''
}

exports.main = async (event = {}) => {
  const shareToken = typeof event.shareToken === 'string' ? event.shareToken : ''
  if (!TOKEN_PATTERN.test(shareToken)) return fail('INVALID_SHARE', '分享链接无效或已失效。')

  try {
    const result = await db.collection('shareCards')
      .where({ shareToken, status: 'ready' })
      .limit(1)
      .get()
    const share = result.data[0]
    if (!share?.creationFileId || !share?.content || !share?.type) {
      return fail('SHARE_NOT_FOUND', '分享内容不存在或已失效。')
    }

    const imageUrl = await getTempUrl(share.creationFileId)
    const shareImageUrl = share.fileId ? await getTempUrl(share.fileId) : ''
    if (!imageUrl) return fail('ASSET_NOT_FOUND', '分享图片暂不可用。')
    return {
      ok: true,
      data: {
        shareToken,
        type: share.type,
        content: share.content,
        imageUrl,
        shareImageUrl,
        shareTitle: share.shareTitle || '照片有话说',
        createdAt: share.createdAt || null
      }
    }
  } catch (error) {
    console.error('读取分享作品失败:', error)
    return fail('GET_SHARED_WORK_FAILED', '分享内容暂不可用，请稍后重试。')
  }
}
