const guideList = [
  { title: '上传灵感照片', desc: '可从相册选择或直接拍摄，建议画质清晰' },
  { title: '等待AI创作', desc: '图像将上传至云端，约7秒完成诗意生成' },
  { title: '保存与分享', desc: '在结果页保存诗图，转发给朋友或朋友圈' }
]

const formatError = (error) =>
  error?.message || error?.errMsg || '请稍后再试，或检查网络与云函数配置'

Page({
  data: {
    imageUrl: '',
    loading: false,
    guideList
  },

  async chooseImage() {
    try {
      const { tempFiles } = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      const tempFilePath = tempFiles?.[0]?.tempFilePath || ''
      if (!tempFilePath) {
        throw new Error('未获取到图片路径')
      }

      this.setData({ imageUrl: tempFilePath })
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

    this.setData({ loading: true })
    wx.showLoading({ title: '诗意创作中...', mask: true })

    try {
      const cloudPath = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.imageUrl
      })

      const { result } = await wx.cloud.callFunction({
        name: 'generatePoem',
        data: { fileID }
      })

      if (!result || result.code !== 0 || !result.data) {
        throw new Error(result?.message || 'AI 创作失败')
      }

      const app = getApp()
      app.globalData.poemResult = result.data
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
      this.setData({ imageUrl: '', loading: false })
      app.globalData.shouldResetSelection = false
    }
  }
})
