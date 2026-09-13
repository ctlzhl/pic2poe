const cloud = require('wx-server-sdk')
const { randomUUID } = require('node:crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const STAGING_TTL_MS = 60 * 60 * 1000

const fail = (code, message) => ({ ok: false, code, message })

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const extension = typeof event.extension === 'string' ? event.extension.toLowerCase().replace(/^\./, '') : ''

  if (!openid) return fail('UNAUTHORIZED', '请先登录后再上传图片。')
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return fail('UNSUPPORTED_IMAGE', '暂不支持这种图片格式，请选择 JPG、PNG 或 WebP。')
  }

  // 让 CloudBase 生成数据库文档 ID；暂存对象使用独立随机标识，避免依赖
  // 不同 SDK 版本对自定义文档 ID / set() 的兼容差异。
  const stagingToken = randomUUID()
  const stagingPath = `users/${openid}/staging/${stagingToken}.${extension}`
  try {
    const result = await db.collection('imageAssets').add({
      data: {
        userId: openid,
        status: 'uploading',
        stagingPath,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        expiresAt: new Date(Date.now() + STAGING_TTL_MS)
      }
    })
    const assetId = result?._id
    if (!assetId) throw new Error('CloudBase 未返回图片资产文档 ID')
    return { ok: true, data: { assetId, stagingPath } }
  } catch (error) {
    console.error('创建图片上传凭证失败:', error)
    const errorText = `${error?.code || ''} ${error?.errCode || ''} ${error?.message || ''} ${error?.errMsg || ''}`
    if (/collection.+not.+exist|DATABASE_COLLECTION_NOT_EXIST/i.test(errorText)) {
      return fail('IMAGE_ASSETS_COLLECTION_MISSING', '服务配置未完成：数据库缺少 imageAssets 集合。')
    }
    return fail('CREATE_UPLOAD_FAILED', '创建上传任务失败，请稍后重试。')
  }
}
