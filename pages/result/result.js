// pages/result/result.js
Page({
  data: {
    originalImageUrl: '',  // 原图URL（用于保存/分享）
    compressedImageUrl: '', // 压缩后的图片URL（用于展示）
    poem: {                // 古诗对象
      title: '',
      body: ''
    },
    canShare: false        // 是否可以分享
  },

  onLoad(options) {
    // 从全局变量获取结果数据
    const app = getApp()
    const result = app.globalData.poemResult
    
    if (result) {
      this.setData({
        originalImageUrl: result.originalImageUrl,
        poem: result.poem,
        canShare: true
      })
    }
  },

  /**
   * 保存图片到相册
   */
  saveImage() {
    // 下载临时URL图片到本地
    wx.downloadFile({
      url: this.data.originalImageUrl,
      success: res => {
        // 保存到相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            })
          },
          fail(err) {
            if (err.errMsg.includes('auth deny')) {
              // 引导用户开启权限
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中开启相册权限',
                confirmText: '去设置',
                success(modalRes) {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                }
              })
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          }
        })
      },
      fail: err => {
        console.error('下载图片失败:', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 返回首页重新创作
   */
  backToHome() {
    wx.navigateBack()
  },

  /**
   * 分享给朋友
   */
  onShareAppMessage() {
    return {
      title: '我用AI创作了一首诗,快来看看',
      path: '/pages/index/index',
      imageUrl: this.data.originalImageUrl
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '图生诗境 - AI诗意创作',
      imageUrl: this.data.originalImageUrl
    }
  }
})