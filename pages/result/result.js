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

Page({
  data: {
    previewUrl: '',
    downloadUrl: '',
    poem: {
      title: '',
      body: ''
    },
    hasError: false,
    errorMessage: ''
  },

  onLoad() {
    const app = getApp()
    const result = app.globalData.poemResult

    if (!result) {
      this.setError('未获取到创作结果，请返回重试')
      return
    }

    const previewUrl = result.displayImageUrl || result.originalImageUrl || ''
    const downloadUrl = result.originalImageUrl || result.displayImageUrl || ''
    const poemTitle = result.poem?.title || '无题'
    const poemBody = (result.poem?.body || '').replace(/\\n/g, '\n')

    if (!previewUrl) {
      this.setError('图片结果缺失，请重新创作')
      return
    }

    this.setData({
      previewUrl,
      downloadUrl,
      poem: {
        title: poemTitle,
        body: poemBody
      },
      hasError: false,
      errorMessage: ''
    })
  },

  async saveImage() {
    if (!this.data.downloadUrl) {
      wx.showToast({ title: '暂无可保存图片', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })
    try {
      const downloadRes = await downloadFile(this.data.downloadUrl)
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
    return {
      title: '我用 AI 创作了一首诗，来看看吧',
      path: '/pages/index/index',
      imageUrl: this.data.previewUrl
    }
  },

  onShareTimeline() {
    return {
      title: '图生诗境 - AI 诗意创作',
      imageUrl: this.data.previewUrl
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
