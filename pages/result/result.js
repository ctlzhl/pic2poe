const { derivePoemObject, normalizePoemResult } = require('../../utils/poem')
const { getCloudFunctionName } = require('../../utils/env')
const { renderPosterToTempFilePath } = require('../../utils/canvasPoster')

const POSTER_QR_URL = 'https://pic2poe.tcloudbaseapp.com/?from=poster'
const DEFAULT_POSTER_WIDTH = 600
const DEFAULT_POSTER_HEIGHT = 800

const downloadFile = (url) =>
  new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: resolve,
      fail: reject
    })
  })

const saveToAlbum = (filePath) =>
  new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    })
  })

const RESULT_FALLBACK_TITLE = '无题'

const resolveImageUrls = (result) => {
  if (!result || typeof result !== 'object') {
    return { previewUrl: '', downloadUrl: '' }
  }
  const fallback = typeof result.imageUrl === 'string' ? result.imageUrl : ''
  const previewUrl = result.displayImageUrl || result.originalImageUrl || fallback
  const downloadUrl = result.originalImageUrl || result.displayImageUrl || fallback
  return { previewUrl, downloadUrl }
}

Page({
  posterTask: null,

  data: {
    previewUrl: '',
    downloadUrl: '',
    poem: {
      title: '',
      body: ''
    },
    hasError: false,
    errorMessage: '',
    resourceMeta: null,
    rewriteLoading: false,
    changeImageLoading: false,
    saveShareLoading: false,
    sharePosterStatus: 'idle',
    sharePosterMeta: null,
    sharePosterMessage: '',
    posterCanvasHeight: DEFAULT_POSTER_HEIGHT
  },

  onLoad() {
    const app = getApp()
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
    const result = app.globalData.poemResult

    if (!result) {
      this.setError('未获取到创作结果，请返回重试')
      return
    }

    const resourceMeta = result.resourceMeta || null
    this.resourceMeta = resourceMeta

    const { previewUrl: remotePreviewUrl, downloadUrl: remoteDownloadUrl } = resolveImageUrls(result)
    const localPreviewUrl = resourceMeta?.localPath || ''
    const normalizedPoem = derivePoemObject(result.poem, RESULT_FALLBACK_TITLE)
    const poemBody = (normalizedPoem.body || '').replace(/\\n/g, '\n')

    const resolvedPreviewUrl = localPreviewUrl || remotePreviewUrl
    const resolvedDownloadUrl = remoteDownloadUrl || remotePreviewUrl || localPreviewUrl

    if (!resolvedPreviewUrl) {
      this.setError('图片结果缺失，请重新创作')
      return
    }

    this.setData({
      previewUrl: resolvedPreviewUrl,
      downloadUrl: resolvedDownloadUrl,
      poem: {
        title: normalizedPoem.title,
        body: poemBody
      },
      hasError: false,
      errorMessage: '',
      resourceMeta
    })

    if (resourceMeta?.fileID) {
      this.refreshRemoteImageUrl()
    }

    this.posterTask = null
    this.posterSignature = this.computePosterSignature()

    const sharePosterMeta = app.globalData.sharePosterMeta
    if (sharePosterMeta && sharePosterMeta.signature === this.posterSignature) {
      this.setData({
        sharePosterStatus: 'ready',
        sharePosterMeta,
        sharePosterMessage: ''
      })
    } else {
      if (sharePosterMeta && sharePosterMeta.signature !== this.posterSignature) {
        app.globalData.sharePosterMeta = null
      }
      this.prepareSharePoster({ silent: true }).catch(() => {})
    }
  },

  async rewritePoem() {
    if (this.data.rewriteLoading) {
      return
    }

    const fileID = await this.ensureImageFileReady()
    if (!fileID) {
      return
    }

    this.setData({ rewriteLoading: true })
    wx.showLoading({ title: '重新创作中...', mask: true })

    try {
      const targetFunctionName = getCloudFunctionName('generatePoem')
      const { result } = await wx.cloud.callFunction({
        name: targetFunctionName,
        data: { fileID }
      })

      if (!result || result.code !== 0 || !result.data) {
        throw new Error(result?.message || 'AI 创作失败')
      }

      const normalizedResult = normalizePoemResult(result.data, { fallbackTitle: RESULT_FALLBACK_TITLE })
      if (!normalizedResult) {
        throw new Error('AI 创作结果格式异常')
      }

      const rawPoemPayload = result && result.data ? result.data.poem : null

      this.resourceMeta = {
        ...(this.resourceMeta || {}),
        fileID
      }

      const resultWithResourceMeta = {
        ...normalizedResult,
        rawPoem: rawPoemPayload,
        resourceMeta: this.resourceMeta
      }

      const { previewUrl, downloadUrl } = resolveImageUrls(resultWithResourceMeta)
      const poemBody = (resultWithResourceMeta.poem.body || '').replace(/\\n/g, '\n')

      this.setData({
        poem: {
          title: resultWithResourceMeta.poem.title,
          body: poemBody
        },
        previewUrl: previewUrl || this.data.previewUrl,
        downloadUrl: downloadUrl || this.data.downloadUrl,
        hasError: false,
        errorMessage: '',
        resourceMeta: this.resourceMeta
      })

      const app = getApp()
      app.globalData.poemResult = resultWithResourceMeta
      app.globalData.sharePosterMeta = null
      this.resetSharePosterState()
      this.posterSignature = this.computePosterSignature()
      this.prepareSharePoster({ silent: true }).catch(() => {})
    } catch (error) {
      console.error('重新创作失败:', error)
      wx.showToast({ title: error?.message || '重新创作失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ rewriteLoading: false })
    }
  },

  async ensureImageFileReady() {
    const meta = this.resourceMeta || this.data.resourceMeta || {}
    if (meta.fileID) {
      return meta.fileID
    }

    if (meta.localPath) {
      return await this.uploadLocalImage(meta.localPath, meta)
    }

    const downloadUrl = this.data.downloadUrl || this.data.previewUrl
    if (downloadUrl) {
      try {
        const downloadRes = await downloadFile(downloadUrl)
        if (downloadRes.statusCode === 200 && downloadRes.tempFilePath) {
          return await this.uploadLocalImage(downloadRes.tempFilePath, meta)
        }
      } catch (error) {
        console.error('下载结果图片失败:', error)
      }
    }

    wx.showToast({ title: '缺少可用图片，请返回重试', icon: 'none' })
    return ''
  },

  async uploadLocalImage(localPath, baseMeta = {}) {
    if (!localPath) {
      return ''
    }

    try {
      const cloudPath = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath,
        filePath: localPath
      })

      this.resourceMeta = {
        ...baseMeta,
        ...this.resourceMeta,
        localPath,
        cloudPath,
        fileID,
        uploadedAt: Date.now()
      }
      this.setData({ resourceMeta: this.resourceMeta })

      const app = getApp()
      if (app.globalData?.poemResult) {
        app.globalData.poemResult.resourceMeta = this.resourceMeta
      }
      this.posterSignature = this.computePosterSignature()
      return fileID
    } catch (error) {
      console.error('上传图片失败:', error)
      wx.showToast({ title: '图片上传失败', icon: 'none' })
      return ''
    }
  },

  async getPosterSourceImagePath() {
    const meta = this.resourceMeta || this.data.resourceMeta || {}
    if (meta.localPath) {
      return meta.localPath
    }

    const downloadUrl = await this.ensureDownloadUrl()
    if (!downloadUrl) {
      wx.showToast({ title: '图片资源暂不可用，请稍后重试', icon: 'none' })
      return ''
    }

    try {
      const downloadResult = await downloadFile(downloadUrl)
      if (downloadResult.statusCode === 200 && downloadResult.tempFilePath) {
        return downloadResult.tempFilePath
      }
      wx.showToast({ title: '图片下载失败', icon: 'none' })
      return ''
    } catch (error) {
      console.error('获取分享图源图片失败:', error)
      wx.showToast({ title: '图片下载失败', icon: 'none' })
      return ''
    }
  },

  changeImageAndRestart() {
    if (this.data.changeImageLoading) {
      return
    }

    const app = getApp()
    app.globalData.poemResult = null
    app.globalData.sharePosterMeta = null
    app.globalData.shouldResetSelection = true

    this.resetSharePosterState()
    this.setData({ changeImageLoading: true })

    wx.navigateBack({
      delta: 1,
      fail: () => {
        this.setData({ changeImageLoading: false })
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
  },

  async handleSaveShare() {
    if (this.data.saveShareLoading || this.data.hasError) {
      return
    }

    if (this.data.sharePosterStatus === 'preparing') {
      wx.showToast({ title: '正在生成中', icon: 'none' })
      return
    }

    this.setData({ saveShareLoading: true })
    wx.showLoading({ title: '准备分享图...', mask: true })

    try {
      const shouldForce = this.data.sharePosterStatus === 'error'
      await this.prepareSharePoster({ force: shouldForce, silent: true })
      const meta = this.data.sharePosterMeta || getApp().globalData.sharePosterMeta
      if (!meta || (!meta.localTempFilePath && !meta.fileID)) {
        throw new Error('分享图生成中，请稍后再试')
      }
      const localPath = await this.ensureSharePosterLocalPath(meta)
      if (!localPath) {
        throw new Error('分享图生成中，请稍后再试')
      }

      await new Promise((resolve, reject) => {
        wx.showShareImageMenu({
          path: localPath,
          success: resolve,
          fail: reject
        })
      })
    } catch (error) {
      if (!this.handleAlbumPermissionError(error)) {
        console.error('准备分享图失败:', error)
        wx.showToast({ title: error?.message || '分享图生成失败', icon: 'none' })
      }
    } finally {
      wx.hideLoading()
      this.setData({ saveShareLoading: false })
    }
  },

  async refreshRemoteImageUrl({ showToastOnError = false } = {}) {
    if (!this.resourceMeta?.fileID) {
      return ''
    }
    try {
      const { fileList } = await wx.cloud.getTempFileURL({
        fileList: [
          {
            fileID: this.resourceMeta.fileID,
            maxAge: 60 * 60
          }
        ]
      })
      const tempUrl = fileList?.[0]?.tempFileURL || ''
      if (tempUrl) {
        const usingLocalPreview =
          this.resourceMeta?.localPath && this.data.previewUrl === this.resourceMeta.localPath
        const shouldUpdatePreview =
          !usingLocalPreview && (!this.data.previewUrl || this.data.previewUrl === this.data.downloadUrl)
        this.setData({
          downloadUrl: tempUrl,
          previewUrl: shouldUpdatePreview ? tempUrl : this.data.previewUrl
        })
      }
      return tempUrl
    } catch (error) {
      console.error('刷新云文件链接失败:', error)
      if (showToastOnError) {
        wx.showToast({ title: '图片链接刷新失败', icon: 'none' })
      }
      return ''
    }
  },

  async ensureDownloadUrl() {
    const currentUrl = this.data.downloadUrl
    const isRemoteUrl = typeof currentUrl === 'string' && currentUrl.startsWith('http')
    if (currentUrl && isRemoteUrl) {
      return currentUrl
    }
    return await this.refreshRemoteImageUrl({ showToastOnError: true })
  },

  async saveImage() {
    if (!this.data.downloadUrl && !this.resourceMeta?.fileID) {
      wx.showToast({ title: '暂无可保存图片', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })
    try {
      let downloadUrl = await this.ensureDownloadUrl()
      if (!downloadUrl) {
        throw new Error('图片链接失效')
      }

      let downloadRes = await downloadFile(downloadUrl)
      if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
        downloadUrl = await this.refreshRemoteImageUrl({ showToastOnError: true })
        if (!downloadUrl) {
          throw new Error('图片链接刷新失败')
        }
        downloadRes = await downloadFile(downloadUrl)
      }

      if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
        throw new Error('图片下载失败')
      }

      await saveToAlbum(downloadRes.tempFilePath)
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (error) {
      if (!this.handleAlbumPermissionError(error)) {
        console.error('保存图片失败:', error)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    } finally {
      wx.hideLoading()
    }
  },

  buildPosterPoemPayload() {
    const app = getApp()
    const result = app.globalData.poemResult || {}
    const poem = result.poem || { title: RESULT_FALLBACK_TITLE, body: '' }
    const rawPoem = result.rawPoem || {}

    let lines = []
    if (Array.isArray(rawPoem.poem_lines) && rawPoem.poem_lines.length) {
      lines = rawPoem.poem_lines
    } else if (Array.isArray(rawPoem.lines) && rawPoem.lines.length) {
      lines = rawPoem.lines
    } else if (typeof rawPoem.body === 'string' && rawPoem.body.trim()) {
      lines = rawPoem.body
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    } else if (typeof poem.body === 'string') {
      lines = poem.body
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    }

    const imagerySummary =
      rawPoem.imagery_summary ||
      rawPoem.imagerySummary ||
      result.imagerySummary ||
      this.deriveImagerySummaryFallback(poem.body)

    return {
      title: poem.title || RESULT_FALLBACK_TITLE,
      body: poem.body || '',
      lines,
      imagerySummary
    }
  },

  deriveImagerySummaryFallback(body = '') {
    const cleaned = (body || '').replace(/\s+/g, '')
    if (!cleaned) {
      return '一帧光影里的静谧余温'
    }
    return cleaned.slice(0, 24)
  },

  buildQrPayload() {
    return POSTER_QR_URL
  },

  computePosterSignature() {
    const app = getApp()
    const result = app.globalData.poemResult || {}
    const poem = result.poem || {}
    const cloudPath = result.resourceMeta?.cloudPath || ''
    return `${poem.title || ''}|${poem.body || ''}|${cloudPath || ''}`
  },

  resetSharePosterState({ keepApp = false } = {}) {
    this.posterTask = null
    this.setData({
      sharePosterStatus: 'idle',
      sharePosterMeta: null,
      sharePosterMessage: '',
      posterCanvasHeight: DEFAULT_POSTER_HEIGHT
    })
    this.posterSignature = this.computePosterSignature()
    if (!keepApp) {
      const app = getApp()
      if (app?.globalData) {
        app.globalData.sharePosterMeta = null
      }
    }
  },

  syncPosterCanvasHeight(nextHeight) {
    const normalizedHeight = Math.max(1, Math.round(nextHeight || DEFAULT_POSTER_HEIGHT))
    if (normalizedHeight === this.data.posterCanvasHeight) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.setData({ posterCanvasHeight: normalizedHeight }, resolve)
    })
  },

  async prepareSharePoster({ force = false, silent = false } = {}) {
    const app = getApp()
    if (this.data.hasError || !app.globalData.poemResult) {
      return null
    }

    if (!force) {
      if (this.data.sharePosterStatus === 'ready' && this.data.sharePosterMeta) {
        return this.data.sharePosterMeta
      }
      if (this.posterTask) {
        return this.posterTask
      }
    } else {
      this.posterTask = null
    }

    const execute = async () => {
      if (!silent) {
        wx.showLoading({ title: '生成分享图...', mask: true })
      }
      this.setData({
        sharePosterStatus: 'preparing',
        sharePosterMessage: ''
      })
      try {
        const posterSourceImagePath = await this.getPosterSourceImagePath()
        if (!posterSourceImagePath) {
          throw new Error('缺少可用图片')
        }

        this.posterSignature = this.computePosterSignature()
        const poemPayload = this.buildPosterPoemPayload()

        const globalResult = app.globalData.poemResult || {}
        const resourceMeta = globalResult.resourceMeta || this.data.resourceMeta || {}
        const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null
        const pixelRatio = (systemInfo && systemInfo.pixelRatio) || 2

        const posterWidth = DEFAULT_POSTER_WIDTH
        const posterHeight = DEFAULT_POSTER_HEIGHT

        const renderResult = await renderPosterToTempFilePath({
          canvasId: 'sharePosterCanvas',
          posterWidth,
          posterHeight,
          pixelRatio,
          imagePath: posterSourceImagePath,
          poemTitle: poemPayload.title,
          poemLines: poemPayload.lines,
          imagerySummary: poemPayload.imagerySummary,
          qrText: this.buildQrPayload(),
          imageMeta: {
            width: resourceMeta.width,
            height: resourceMeta.height,
            aspectRatio: resourceMeta.aspectRatio,
            orientationHint: resourceMeta.orientationHint,
            isPortrait: resourceMeta.isPortrait
          },
          onLayoutResolved: (layout) => this.syncPosterCanvasHeight(layout.posterHeight)
        })

        if (!renderResult || !renderResult.tempFilePath) {
          throw new Error('生成分享图失败，请稍后重试')
        }

        const signature = this.posterSignature || this.computePosterSignature()
        const sharePosterMeta = {
          reused: false,
          fileID: '',
          cloudPath: '',
          tempFileURL: '',
          layout: renderResult.layout || null,
          meta: {
            hash: signature,
            storagePrefix: 'local',
            generatedAt: new Date().toISOString()
          },
          localTempFilePath: renderResult.tempFilePath,
          signature,
          generatedAt: Date.now()
        }

        this.setData({
          sharePosterStatus: 'ready',
          sharePosterMeta,
          sharePosterMessage: ''
        })

        app.globalData.sharePosterMeta = sharePosterMeta
        return sharePosterMeta
      } catch (error) {
        console.error('分享图生成失败:', error)
        this.setData({
          sharePosterStatus: 'error',
          sharePosterMessage: error?.message || '分享图生成失败'
        })
        throw error
      } finally {
        if (!silent) {
          wx.hideLoading()
        }
        this.posterTask = null
      }
    }

    this.posterTask = execute()
    return this.posterTask
  },

  async ensureSharePosterLocalPath(meta) {
    const currentMeta = meta || this.data.sharePosterMeta || getApp().globalData.sharePosterMeta
    if (!currentMeta) {
      return ''
    }

    if (currentMeta.localTempFilePath) {
      return currentMeta.localTempFilePath
    }

    if (currentMeta.fileID) {
      const downloadRes = await wx.cloud.downloadFile({ fileID: currentMeta.fileID })
      if (downloadRes.statusCode === 200 && downloadRes.tempFilePath) {
        const nextMeta = { ...currentMeta, localTempFilePath: downloadRes.tempFilePath }
        this.setData({ sharePosterMeta: nextMeta })
        const app = getApp()
        if (app?.globalData) {
          app.globalData.sharePosterMeta = nextMeta
        }
        return downloadRes.tempFilePath
      }
    }

    return ''
  },

  handleAlbumPermissionError(error) {
    if (error?.errMsg?.includes('auth deny')) {
      wx.showModal({
        title: '需要相册权限',
        content: '请在设置中开启保存到相册权限',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting()
          }
        }
      })
      return true
    }
    return false
  },

  backToHome() {
    const app = getApp()
    app.globalData.shouldResetSelection = true
    app.globalData.shouldAutoChooseImage = false
    app.globalData.poemResult = null
    app.globalData.sharePosterMeta = null
    this.resetSharePosterState()
    wx.navigateBack()
  },

  setError(message) {
    this.setData({
      hasError: true,
      errorMessage: message,
      previewUrl: '',
      downloadUrl: ''
    })
    this.resetSharePosterState()
  }
})
