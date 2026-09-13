const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PAGE_SIZE = 30
const fail = (code, message) => ({ ok: false, code, message })

const toTimestamp = (value) => {
  if (value instanceof Date) return value.getTime()
  if (typeof value?.getTime === 'function') return value.getTime()
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const titleFor = (work) => {
  if (work.type === 'poem') return work.content?.poem?.title || '一首小诗'
  if (work.type === 'review') return work.content?.review?.headline || '图片点评'
  return work.content?.copy?.headline || '配图文案'
}

const excerptFor = (work) => {
  if (work.type === 'poem') return (work.content?.poem?.lines || []).join(' · ')
  if (work.type === 'review') return work.content?.review?.body || ''
  return work.content?.copy?.body || ''
}

const readAsset = async (assetId, openid) => {
  if (!assetId) return null
  try {
    const result = await db.collection('imageAssets').doc(assetId).get()
    return result.data?.userId === openid ? result.data : null
  } catch (error) {
    return null
  }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  if (!openid) return fail('UNAUTHORIZED', '请先登录后再查看作品。')
  const requestedLimit = Number(event.limit)
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(PAGE_SIZE, requestedLimit)
    : PAGE_SIZE

  try {
    const worksCollection = db.collection('works').where({ userId: openid })
    const [result, countResult] = await Promise.all([
      worksCollection.orderBy('createdAt', 'desc').limit(limit).get(),
      worksCollection.count()
    ])
    const works = result.data || []
    const assets = await Promise.all(works.map((work) => readAsset(work.imageAssetId, openid)))
    const fileIds = [...new Set(assets.map((asset) => asset?.thumbnailFileId).filter(Boolean))]
    const fileResult = fileIds.length > 0 ? await cloud.getTempFileURL({ fileList: fileIds }) : { fileList: [] }
    const thumbnailUrls = new Map((fileResult.fileList || []).map((file) => [file.fileID, file.tempFileURL || '']))

    return {
      ok: true,
      data: {
        total: Number(countResult.total || 0),
        works: works.map((work, index) => ({
          workId: work._id,
          type: work.type,
          title: titleFor(work),
          excerpt: excerptFor(work).slice(0, 72),
          thumbnailUrl: thumbnailUrls.get(assets[index]?.thumbnailFileId) || '',
          createdAt: toTimestamp(work.createdAt)
        }))
      }
    }
  } catch (error) {
    console.error('读取作品列表失败:', error)
    return fail('LIST_WORKS_FAILED', '读取作品列表失败，请稍后重试。')
  }
}
