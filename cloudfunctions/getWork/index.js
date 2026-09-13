const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const fail = (code, message) => ({ ok: false, code, message })

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  const workId = typeof event.workId === 'string' ? event.workId : ''
  if (!openid) return fail('UNAUTHORIZED', '请先登录后再查看作品。')
  if (!workId) return fail('INVALID_WORK', '作品不存在或已失效。')

  try {
    const workResult = await db.collection('works').doc(workId).get()
    const work = workResult.data
    if (!work || work.userId !== openid) return fail('WORK_NOT_FOUND', '作品不存在或已失效。')
    const assetResult = await db.collection('imageAssets').doc(work.imageAssetId).get()
    const asset = assetResult.data
    if (!asset || asset.userId !== openid || !asset.creationFileId) return fail('ASSET_NOT_FOUND', '作品图片已失效。')

    const fileResult = await cloud.getTempFileURL({ fileList: [asset.creationFileId] })
    const imageUrl = fileResult.fileList?.[0]?.tempFileURL || ''
    if (!imageUrl) return fail('ASSET_NOT_FOUND', '作品图片暂不可用。')
    return {
      ok: true,
      data: {
        workId: work._id,
        type: work.type,
        content: work.content,
        imageUrl,
        createdAt: work.createdAt || null
      }
    }
  } catch (error) {
    console.error('读取作品失败:', error)
    return fail('GET_WORK_FAILED', '读取作品失败，请稍后重试。')
  }
}
