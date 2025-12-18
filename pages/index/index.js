const { normalizePoemResult } = require('../../utils/poem')
const { CURRENT_ENVIRONMENT, getCloudFunctionName } = require('../../utils/env')

const SHARE_TITLE = '拍照上传，生成你的专属古风诗图'
const SHARE_PATH = '/pages/index/index'
const SHARE_CARD_IMAGE_PATH = 'https://pic2poe-1336288744.cos.ap-shanghai.myqcloud.com/share-card.jpg'

const guideList = [
  { title: '上传灵感照片', desc: '可从相册选择或直接拍摄，建议画质清晰' },
  { title: '等待创作', desc: '图像将上传至云端，约7秒完成诗意生成' },
  { title: '保存与分享', desc: '在结果页保存诗图，转发给朋友或朋友圈' }
]

const db = wx.cloud ? wx.cloud.database() : null
const poemCollection = db ? db.collection('poemRecords') : null

const buildResourceMeta = (tempFile) => {
  if (!tempFile || typeof tempFile !== 'object') {
    return null
  }
  const localPath = tempFile.tempFilePath || ''
  if (!localPath) {
    return null
  }

  const width = Number(tempFile.width) || 0
  const height = Number(tempFile.height) || 0
  const aspectRatio = width > 0 && height > 0 ? width / height : 0
  const hasOrientation = width > 0 && height > 0
  const isPortrait = hasOrientation ? height >= width * 0.98 : null
  const orientationHint = hasOrientation ? (isPortrait ? 'portrait' : 'landscape') : ''

  return {
    localPath,
    size: tempFile.size || 0,
    width,
    height,
    aspectRatio,
    orientationHint,
    isPortrait,
    duration: tempFile.duration || 0,
    fileType: tempFile.fileType || 'image',
    createdAt: Date.now(),
    cloudPath: '',
    fileID: ''
  }
}

const mergeResourceMetaWithUpload = (resourceMeta, uploadInfo) => {
  if (!resourceMeta) {
    return null
  }
  const { cloudPath = '', fileID = '' } = uploadInfo || {}
  return {
    ...resourceMeta,
    cloudPath: cloudPath || resourceMeta.cloudPath || '',
    fileID: fileID || resourceMeta.fileID || '',
    uploadedAt: Date.now()
  }
}

const persistPoemRecord = async ({ normalizedResult, resourceMeta }) => {
  if (!normalizedResult || !resourceMeta || !poemCollection) {
    return
  }
  try {
    await poemCollection.add({
      data: {
        poem: normalizedResult.poem,
        displayImageUrl: normalizedResult.displayImageUrl || '',
        originalImageUrl: normalizedResult.originalImageUrl || '',
        remoteImageUrl: normalizedResult.imageUrl || '',
        resourceMeta,
        createdAt: db.serverDate()
      }
    })
  } catch (error) {
    console.warn('记录诗歌结果失败:', error)
  }
}

const formatError = (error) =>
  error?.message || error?.errMsg || '请稍后再试，或检查网络与云函数配置'

Page({
  data: {
    imageUrl: '',
    loading: false,
    guideList,
    resourceMeta: null
  },

  onLoad() {
    if (wx && typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    }
  },

  noop() {},

  handleMainTap() {
    const { imageUrl, loading } = this.data
    if (imageUrl || loading) {
      return
    }
    this.chooseImage()
  },

  async chooseImage() {
    try {
      const { tempFiles } = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      const selectedFile = tempFiles?.[0]
      const tempFilePath = selectedFile?.tempFilePath || ''
      if (!tempFilePath) {
        throw new Error('未获取到图片路径')
      }

      const resourceMeta = buildResourceMeta(selectedFile)

      this.setData({
        imageUrl: tempFilePath,
        resourceMeta
      })
    } catch (error) {
      if (error?.errMsg?.includes('cancel')) {
        return
      }
      console.error('选择图片失败:', error)
      wx.showToast({ title: '选择图片失败', icon: 'none' })
    }
  },

  async generatePoem() {
    if (!this.data.imageUrl) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    if (this.data.loading) {
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '诗意创作中...', mask: true })

    const fallbackMetaFromState = this.data.imageUrl
      ? buildResourceMeta({ tempFilePath: this.data.imageUrl })
      : null
    const resourceMetaBeforeUpload = this.data.resourceMeta || fallbackMetaFromState

    try {
      const cloudPath = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.imageUrl
      })

      const resourceMetaWithCloud =
        mergeResourceMetaWithUpload(resourceMetaBeforeUpload, { cloudPath, fileID }) || {
          localPath: this.data.imageUrl,
          cloudPath,
          fileID,
          uploadedAt: Date.now()
        }

      this.setData({ resourceMeta: resourceMetaWithCloud })

      const targetFunctionName = getCloudFunctionName('generatePoem')
      console.info('[generatePoem] 调用云函数:', targetFunctionName, '当前环境:', CURRENT_ENVIRONMENT)

      const { result } = await wx.cloud.callFunction({
        name: targetFunctionName,
        data: { fileID }
      })

      if (!result || result.code !== 0 || !result.data) {
        throw new Error(result?.message || 'AI 创作失败')
      }

      const normalizedResult = normalizePoemResult(result.data)
      if (!normalizedResult) {
        throw new Error('AI 创作结果格式异常')
      }

      const rawPoemPayload = result && result.data ? result.data.poem : null

      const resultWithResourceMeta = {
        ...normalizedResult,
        rawPoem: rawPoemPayload,
        resourceMeta: resourceMetaWithCloud
      }

      await persistPoemRecord({
        normalizedResult: resultWithResourceMeta,
        resourceMeta: resourceMetaWithCloud
      })

      const app = getApp()
      app.globalData.poemResult = resultWithResourceMeta
      app.globalData.shouldResetSelection = true

      wx.navigateTo({ url: '/pages/result/result' })
    } catch (error) {
      console.error('生成流程失败:', error)
      wx.showModal({
        title: '创作失败',
        content: formatError(error),
        showCancel: false
      })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  onShow() {
    const app = getApp()
    if (app.globalData.shouldResetSelection) {
      this.setData({ imageUrl: '', loading: false, resourceMeta: null })
      app.globalData.shouldResetSelection = false
    }

    if (app.globalData.shouldAutoChooseImage) {
      app.globalData.shouldAutoChooseImage = false
      setTimeout(() => {
        this.chooseImage()
      }, 200)
    }
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: SHARE_PATH,
      imageUrl: SHARE_CARD_IMAGE_PATH
    }
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      imageUrl: SHARE_CARD_IMAGE_PATH,
      query: ''
    }
  }
})
