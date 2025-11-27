const { derivePoemObject } = require('../../utils/poem')

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
  data: {
    previewUrl: '',
    downloadUrl: '',
    poem: {
      title: '',
      body: ''
    },
    hasError: false,
    errorMessage: '',
    resourceMeta: null
  },

  onLoad() {
    const app = getApp()
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
      } else {
        console.error('保存图片失败:', error)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    } finally {
      wx.hideLoading()
    }
  },

  backToHome() {
    const app = getApp()
    app.globalData.shouldResetSelection = true
    app.globalData.poemResult = null
    wx.navigateBack()
  },

  onShareAppMessage() {
    const imageUrl = this.data.downloadUrl || this.data.previewUrl
    return {
      title: '我用 AI 创作了一首诗，来看看吧',
      path: '/pages/index/index',
      imageUrl
    }
  },

  onShareTimeline() {
    const imageUrl = this.data.downloadUrl || this.data.previewUrl
    return {
      title: '图生诗境 - AI 诗意创作',
      imageUrl
    }
  },

  setError(message) {
    this.setData({
      hasError: true,
      errorMessage: message,
      previewUrl: '',
      downloadUrl: ''
    })
  }
})
