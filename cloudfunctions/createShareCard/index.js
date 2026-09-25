const crypto = require('node:crypto')
const cloud = require('wx-server-sdk')
const { landscapePoemLayout, portraitPoemLayout, editorialTypography, editorialLayoutFor, editorialSideBySideLayout } = require('./share-layout')
const { canCreateShareForWork, canReuseShareCard } = require('./share-core')
const { checkImage, checkText } = require('./security-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const CANVAS_WIDTH = 1440
const CANVAS_HEIGHT = 1800
const TEMPLATE_VERSION = 'share-v8'
const CARD_TOP_GAP = 48
const WXACODE_PAGE = 'pages/result/result'
let sharp
let wechatAccessTokenCache = null

const fail = (code, message) => ({ ok: false, code, message })
const loadSharp = () => {
  if (!sharp) sharp = require('sharp')
  return sharp
}
const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const normalizeText = (value, maxLength = 180) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)

const truncate = (value, maxLength) => {
  const text = normalizeText(value, maxLength + 1)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const redactShareText = (value, location) => {
  let text = String(value || '')
  const normalizedLocation = String(location || '').trim()
  if (normalizedLocation.length >= 2) {
    text = text.replace(new RegExp(escapeRegExp(normalizedLocation), 'g'), '此处')
  }
  return text
    .replace(/1[3-9]\d{9}/g, '联系方式已隐藏')
    .replace(/\d{17}[\dXx]/g, '身份信息已隐藏')
}

const redactShareContent = (value, location) => {
  if (Array.isArray(value)) return value.map((item) => redactShareContent(item, location))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactShareContent(item, location)]))
  }
  return typeof value === 'string' ? redactShareText(value, location) : value
}

const wrapText = (value, maxChars, maxLines) => {
  const text = normalizeText(value, maxChars * maxLines + 1)
  if (!text) return []
  const chars = Array.from(text)
  const lines = []
  for (let start = 0; start < chars.length && lines.length < maxLines; start += maxChars) {
    lines.push(chars.slice(start, start + maxChars).join(''))
  }
  if (chars.length > maxChars * maxLines && lines.length > 0) {
    const last = Array.from(lines[lines.length - 1]).slice(0, Math.max(1, maxChars - 1)).join('')
    lines[lines.length - 1] = `${last}…`
  }
  return lines
}

const svgText = (lines, { x, y, fontSize, lineHeight, fill = '#334033', weight = 400, family = 'sans-serif', anchor = 'start' }) => lines
  .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-family="${family}" font-size="${fontSize}" font-weight="${weight}">${escapeXml(line)}</text>`)
  .join('')

const contentHash = (work) => crypto
  .createHash('sha256')
  .update(JSON.stringify({ type: work.type, content: work.content, templateVersion: TEMPLATE_VERSION }))
  .digest('hex')

const createShareToken = () => crypto.randomBytes(20).toString('base64url')

const templateFor = (type, imageMetadata) => {
  if (type === 'poem') {
    return imageMetadata.width > imageMetadata.height * 1.1 ? 'poem-landscape-v1' : 'poem-portrait-v1'
  }
  const editorialLayout = editorialLayoutFor(imageMetadata)
  return type === 'review'
    ? `review-editorial-${editorialLayout.kind}-v1`
    : `copy-moment-${editorialLayout.kind}-v1`
}

const getShareTitle = (work) => {
  if (work.type === 'poem') return `一张照片，长出一首${truncate(work.content?.poem?.title || '小诗', 12)}`
  if (work.type === 'review') return truncate(work.content?.review?.headline || '照片有话说', 28)
  return truncate(work.content?.copy?.headline || '照片有话说', 28)
}

const renderPhoto = (imageBuffer, width, height, options = {}) => sharp(imageBuffer)
  .rotate()
  .resize({
    width,
    height,
    fit: options.fit || 'contain',
    position: options.position || 'centre',
    background: '#e7e1d5',
    withoutEnlargement: false
  })
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer()

const qrImage = (buffer) => sharp(buffer)
  .flatten({ background: '#ffffff' })
  .resize({ width: 150, height: 150, fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer()

const createError = (code, detail = '') => {
  const error = new Error(code)
  error.detail = detail
  return error
}

const getWechatAccessToken = async () => {
  const appId = String(process.env.WECHAT_MINIPROGRAM_APP_ID || '').trim()
  const appSecret = String(process.env.WECHAT_MINIPROGRAM_APP_SECRET || '').trim()
  if (!appId || !appSecret) {
    throw createError('WXACODE_CREDENTIALS_MISSING')
  }

  if (wechatAccessTokenCache && wechatAccessTokenCache.expiresAt > Date.now()) {
    return wechatAccessTokenCache.value
  }

  const params = new URLSearchParams({
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret
  })
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${params}`)
  const payload = await response.json()
  if (!response.ok || !payload?.access_token) {
    throw createError('WXACODE_ACCESS_TOKEN_FAILED', `${payload?.errcode || response.status} | ${payload?.errmsg || '微信接口未返回 access_token'}`)
  }

  // 云函数实例可能复用；提前五分钟过期，避免使用临界 token。
  const ttlMs = Math.max(60, Number(payload.expires_in || 7200) - 300) * 1000
  wechatAccessTokenCache = { value: payload.access_token, expiresAt: Date.now() + ttlMs }
  return payload.access_token
}

const getWxaCodeViaHttps = async (shareToken) => {
  const accessToken = await getWechatAccessToken()
  const response = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scene: `s=${shareToken}`,
      page: WXACODE_PAGE,
      check_path: false,
      env_version: process.env.WXACODE_ENV_VERSION || 'develop',
      width: 280,
      auto_color: false,
      line_color: { r: 47, g: 60, b: 46 },
      is_hyaline: false
    })
  })
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    throw createError('WXACODE_HTTPS_FAILED', `${payload?.errcode || response.status} | ${payload?.errmsg || '微信接口未返回图片'}`)
  }
  if (!response.ok) throw createError('WXACODE_HTTPS_FAILED', `HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const compose = async (photo, photoPosition, textSvg, qr, qrPosition) => sharp({
  create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 3, background: '#f7f1e7' }
})
  .composite([
    { input: photo, left: photoPosition.left, top: photoPosition.top },
    { input: Buffer.from(textSvg), left: 0, top: 0 },
    { input: qr, left: qrPosition.left, top: qrPosition.top }
  ])
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer()

const renderPoemCard = async (work, source, metadata, qr) => {
  const title = truncate(work.content?.poem?.title || '这一刻', 14)
  const lines = Array.isArray(work.content?.poem?.lines) ? work.content.poem.lines.slice(0, 4) : []
  const family = 'Noto Serif CJK SC, Songti SC, STKaiti, serif'
  const landscape = metadata.width > metadata.height * 1.1

  if (landscape) {
    const layout = landscapePoemLayout()
    const photo = await renderPhoto(source, layout.photo.width, layout.photo.height, layout.photo)
    const textSvg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${CANVAS_WIDTH}" height="${layout.photo.top}" fill="#f7f1e7"/>
      ${svgText([title], { x: layout.text.x, y: layout.text.titleY, fontSize: 64, lineHeight: 76, fill: '#263426', weight: 700, family, anchor: layout.text.anchor })}
      ${svgText(lines, { x: layout.text.x, y: layout.text.bodyY, fontSize: 52, lineHeight: 86, fill: '#3c493b', family, anchor: layout.text.anchor })}
    </svg>`
    return compose(photo, { left: layout.photo.left, top: layout.photo.top }, textSvg, qr, layout.qr)
  }

  const titleLines = wrapText(title, 8, 2)
  const rotated = [5, 6, 7, 8].includes(Number(metadata.orientation))
  const imageAspect = rotated ? metadata.height / metadata.width : metadata.width / metadata.height
  const layout = portraitPoemLayout({ titleLineCount: titleLines.length, poemLineCount: lines.length || 1, imageAspect })
  const photo = await renderPhoto(source, layout.photo.width, layout.photo.height, layout.photo)
  const textSvg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${layout.photo.width}" y="0" width="${CANVAS_WIDTH - layout.photo.width}" height="${CANVAS_HEIGHT}" fill="#f7f1e7"/>
    ${svgText(titleLines, { x: layout.text.x, y: layout.text.titleY, fontSize: 58, lineHeight: 78, fill: '#263426', weight: 700, family, anchor: layout.text.anchor })}
    ${svgText(lines, { x: layout.text.x, y: layout.text.bodyY, fontSize: 48, lineHeight: 90, fill: '#3c493b', family, anchor: layout.text.anchor })}
  </svg>`
  return compose(photo, { left: layout.photo.left, top: layout.photo.top }, textSvg, qr, layout.qr)
}

const renderEditorialCard = async (work, source, qr, metadata) => {
  const isReview = work.type === 'review'
  const headline = isReview ? work.content?.review?.headline : work.content?.copy?.headline
  const body = isReview ? work.content?.review?.body : work.content?.copy?.body
  const label = isReview ? '图片点评' : (work.content?.copy?.label || '配图文案')
  const tags = isReview ? work.content?.review?.observations : work.content?.copy?.hashtags
  const tagLine = Array.isArray(tags) ? truncate(tags.filter(Boolean).slice(0, 2).join('  '), 30) : ''
  const typography = editorialTypography()
  const editorialLayout = editorialLayoutFor(metadata)

  if (editorialLayout.kind === 'side-by-side') {
    const titleLines = wrapText(headline, 8, 3)
    const bodyLines = wrapText(body, 12, isReview ? 5 : 6)
    const sideTagLine = truncate(tagLine, 14)
    const layout = editorialSideBySideLayout({
      imageAspect: editorialLayout.imageAspect,
      titleLineCount: titleLines.length || 1,
      bodyLineCount: bodyLines.length || 1
    })
    const photo = await renderPhoto(source, layout.photo.width, layout.photo.height, layout.photo)
    const textSvg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${svgText([truncate(label, 18)], { x: layout.text.x, y: layout.text.labelY, ...typography.label, fill: '#74826f', weight: 700, anchor: layout.text.anchor })}
      ${svgText(titleLines, { x: layout.text.x, y: layout.text.titleY, ...typography.title, fill: '#2f3c2e', weight: 700, anchor: layout.text.anchor })}
      ${svgText(bodyLines, { x: layout.text.x, y: layout.text.bodyY, ...typography.body, fill: '#526052', anchor: layout.text.anchor })}
      ${svgText(sideTagLine ? [sideTagLine] : [], { x: layout.text.x, y: layout.text.tagsY, ...typography.tags, fill: '#74826f', anchor: layout.text.anchor })}
    </svg>`
    return compose(photo, { left: layout.photo.left, top: layout.photo.top }, textSvg, qr, layout.qr)
  }

  // 横图和方图使用上图下文，给照片与正文提供完整宽度。
  const photoHeight = isReview ? 990 : 860
  const photo = await renderPhoto(source, CANVAS_WIDTH, photoHeight - CARD_TOP_GAP)
  const titleLines = wrapText(headline, 14, 2)
  const bodyLines = wrapText(body, 21, isReview ? 3 : 4)
  const textTop = photoHeight + 76
  const textSvg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${photoHeight}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT - photoHeight}" fill="#f7f1e7"/>
    ${svgText([truncate(label, 18)], { x: 84, y: textTop, ...typography.label, fill: '#74826f', weight: 700 })}
    ${svgText(titleLines, { x: 84, y: textTop + 100, ...typography.title, fill: '#2f3c2e', weight: 700 })}
    ${svgText(bodyLines, { x: 84, y: textTop + 100 + titleLines.length * typography.title.lineHeight + 64, ...typography.body, fill: '#526052' })}
    ${svgText(tagLine ? [tagLine] : [], { x: 84, y: 1710, ...typography.tags, fill: '#74826f' })}
  </svg>`
  return compose(photo, { left: 0, top: CARD_TOP_GAP }, textSvg, qr, { left: 1206, top: 1600 })
}

const getWxaCode = async (shareToken) => {
  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: `s=${shareToken}`,
      page: WXACODE_PAGE,
      checkPath: false,
      envVersion: process.env.WXACODE_ENV_VERSION || 'develop',
      width: 280,
      autoColor: false,
      lineColor: { r: 47, g: 60, b: 46 },
      isHyaline: false
    })
    if (!result?.buffer) throw new Error('WXACODE_EMPTY')
    return Buffer.from(result.buffer)
  } catch (error) {
    console.error('生成小程序码失败:', error)
    const isPermissionDenied = String(error?.errCode || '').includes('604101') || String(error?.message || '').includes('604101')
    if (isPermissionDenied) {
      console.warn('云调用权限不可用，改用微信服务端接口生成小程序码。')
      return getWxaCodeViaHttps(shareToken)
    }
    const detail = [error?.errCode, error?.errMsg, error?.message]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 500)
    const wrapped = new Error('WXACODE_FAILED')
    wrapped.detail = detail || '未返回详细错误'
    throw wrapped
  }
}

const getTempUrl = async (fileID) => {
  const result = await cloud.getTempFileURL({ fileList: [fileID] })
  return result.fileList?.[0]?.tempFileURL || ''
}

const existingCard = async (workId, userId, hash) => {
  const result = await db.collection('shareCards')
    .where({ workId, userId, contentHash: hash, status: 'ready', templateVersion: TEMPLATE_VERSION })
    .limit(1)
    .get()
  return result.data[0] || null
}

const ensureCheckedBeforeSharing = async (work, asset, openid) => {
  if (asset.safety?.status !== 'passed') {
    const source = await cloud.downloadFile({ fileID: asset.thumbnailFileId || asset.creationFileId })
    const jpeg = asset.thumbnailFileId
      ? source.fileContent
      : await sharp(source.fileContent).resize(640, 640, { fit: 'inside' }).jpeg({ quality: 75 }).toBuffer()
    await checkImage(cloud, jpeg)
    await db.collection('imageAssets').doc(asset._id).update({
      data: { safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() }, updatedAt: db.serverDate() }
    })
  }
  if (work.safety?.status !== 'passed') {
    await checkText(cloud, JSON.stringify(work.content), openid)
    await db.collection('works').doc(work._id).update({
      data: { safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() } }
    })
  }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  const workId = typeof event.workId === 'string' ? event.workId : ''
  let uploadedFileId = ''
  let sharePersisted = false
  if (!openid) return fail('UNAUTHORIZED', '请先登录后再分享作品。')
  if (!workId) return fail('INVALID_WORK', '作品不存在或已失效。')

  try {
    loadSharp()
    const work = (await db.collection('works').doc(workId).get()).data
    if (!canCreateShareForWork(work, openid)) return fail('WORK_NOT_FOUND', '作品不存在或已失效。')

    let draft = null
    try {
      draft = (await db.collection('creationDrafts').doc(work.draftId).get()).data
    } catch (error) {
      // 旧作品可能没有草稿；继续生成分享图，但不会引入新的用户输入。
      console.warn('读取分享脱敏上下文失败:', error?.message || error)
    }
    const asset = (await db.collection('imageAssets').doc(work.imageAssetId).get()).data
    if (!asset?.creationFileId || asset.userId !== openid) return fail('ASSET_NOT_FOUND', '作品图片已失效，暂不能分享。')
    await ensureCheckedBeforeSharing(work, asset, openid)
    const shareWork = { ...work, content: redactShareContent(work.content, draft?.location) }
    const hash = contentHash(shareWork)
    const reusable = await existingCard(workId, openid, hash)
    if (reusable?.fileId) {
      if (!canReuseShareCard(reusable)) {
        await db.collection('shareCards').doc(reusable._id).update({
          data: { safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() }, updatedAt: db.serverDate() }
        })
      }
      const shareImageUrl = await getTempUrl(reusable.fileId)
      if (shareImageUrl) {
        return { ok: true, data: { shareToken: reusable.shareToken, shareImageUrl, shareTitle: reusable.shareTitle } }
      }
    }

    const source = (await cloud.downloadFile({ fileID: asset.creationFileId })).fileContent
    const metadata = await sharp(source).metadata()
    if (!metadata.width || !metadata.height) throw new Error('INVALID_SOURCE_IMAGE')

    const shareToken = createShareToken()
    const qr = await qrImage(await getWxaCode(shareToken))
    const template = templateFor(shareWork.type, metadata)
    const card = shareWork.type === 'poem'
      ? await renderPoemCard(shareWork, source, metadata, qr)
      : await renderEditorialCard(shareWork, source, qr, metadata)
    const cardPath = `users/${openid}/share/${workId}/${TEMPLATE_VERSION}-${hash.slice(0, 16)}.jpg`
    const upload = await cloud.uploadFile({ cloudPath: cardPath, fileContent: card })
    uploadedFileId = upload.fileID
    const shareTitle = getShareTitle(shareWork)

    await db.runTransaction(async (transaction) => {
      // 删除作品与生成分享图可能并发发生。提交公开快照前再次确认作品和图片
      // 仍属于当前用户，避免已删除作品重新出现可访问的分享凭证。
      let latestWork = null
      let latestAsset = null
      try {
        latestWork = (await transaction.collection('works').doc(workId).get()).data
        latestAsset = (await transaction.collection('imageAssets').doc(work.imageAssetId).get()).data
      } catch (error) {
        throw new Error('WORK_NOT_FOUND')
      }
      if (!canCreateShareForWork(latestWork, openid) || !latestAsset || latestAsset.userId !== openid) {
        throw new Error('WORK_NOT_FOUND')
      }
      await transaction.collection('shareCards').add({
        data: {
          workId,
          userId: openid,
          shareToken,
          type: shareWork.type,
          content: shareWork.content,
          creationFileId: asset.creationFileId,
          template,
          templateVersion: TEMPLATE_VERSION,
          contentHash: hash,
          fileId: upload.fileID,
          shareTitle,
          safety: { status: 'passed', provider: 'wechat', checkedAt: db.serverDate() },
          status: 'ready',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    })
    sharePersisted = true

    const shareImageUrl = await getTempUrl(upload.fileID)
    if (!shareImageUrl) throw new Error('SHARE_FILE_UNAVAILABLE')
    return { ok: true, data: { shareToken, shareImageUrl, shareTitle } }
  } catch (error) {
    // 上传与快照写入并非同一个原子操作。只有尚未写入快照时才补偿删除，
    // 避免因为临时 URL 获取失败而误删一个已经可被复用的分享成品图。
    if (uploadedFileId && !sharePersisted) {
      try {
        await cloud.deleteFile({ fileList: [uploadedFileId] })
      } catch (cleanupError) {
        console.warn('回收未登记分享图失败:', cleanupError?.message || cleanupError)
      }
    }
    console.error('生成分享成品图失败:', error)
    if (/Could not load the "sharp" module|sharp.*runtime/i.test(error?.message || '')) {
      return fail('SHARP_UNAVAILABLE', '分享图处理服务未正确部署，请联系管理员更新服务。')
    }
    if (error?.message === 'WORK_NOT_FOUND') return fail('WORK_NOT_FOUND', '作品已删除，无法生成分享图。')
    if (error?.message === 'CONTENT_REJECTED') return fail('CONTENT_REJECTED', '内容含违规信息，请更换后重试。')
    if (error?.message === 'CONTENT_CHECK_UNAVAILABLE') return fail('CONTENT_CHECK_UNAVAILABLE', '内容校验暂不可用，请稍后重试。')
    if (error?.message === 'WXACODE_FAILED') {
      return fail('WXACODE_FAILED', '小程序码生成失败，请稍后重试。')
    }
    if (error?.message === 'WXACODE_CREDENTIALS_MISSING') {
      return fail('WXACODE_CREDENTIALS_MISSING', '分享服务尚未配置小程序凭据，请联系管理员完成配置。')
    }
    if (error?.message === 'WXACODE_ACCESS_TOKEN_FAILED' || error?.message === 'WXACODE_HTTPS_FAILED') {
      return fail('WXACODE_HTTPS_FAILED', '小程序码生成失败，请稍后重试。')
    }
    return fail('CREATE_SHARE_FAILED', '分享图生成失败，请稍后重试。')
  }
}
