// index.js
Page({
  data: {
    imageUrl: '',        // 选中的图片路径
    loading: false       // 加载状态
  },

  /**
   * 选择或拍摄图片
   */
  chooseImage() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        that.setData({
          imageUrl: tempFilePath
        })
        console.log('选择图片成功:', tempFilePath)
      },
      fail(err) {
        console.error('选择图片失败:', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 生成古诗
   */
  generatePoem() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({
      title: '诗意创作中...',
      mask: true
    })

    const that = this
    
    // 上传图片到云存储
    const cloudPath = `images/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: this.data.imageUrl,
      success: uploadRes => {
        console.log('上传成功，文件ID:', uploadRes.fileID)
        
        // 调用云函数生成古诗和合成图片
        wx.cloud.callFunction({
          name: 'generatePoem',
          data: {
            fileID: uploadRes.fileID
          },
          success: funcRes => {
            console.log('云函数调用成功:', funcRes)
            wx.hideLoading()
            that.setData({ loading: false })
            
            if (funcRes.result.success) {
              // 将结果保存到全局变量
              getApp().globalData.poemResult = funcRes.result
              
              // 跳转到结果页
              wx.navigateTo({
                url: '/pages/result/result'
              })
            } else {
              wx.showToast({
                title: funcRes.result.message || '创作失败',
                icon: 'none'
              })
            }
          },
          fail: funcErr => {
            console.error('云函数调用失败:', funcErr)
            wx.hideLoading()
            that.setData({ loading: false })
            wx.showModal({
              title: '创作失败',
              content: '请检查云函数配置是否正确。错误信息：' + (funcErr.errMsg || '未知错误'),
              showCancel: false
            })
          }
        })
      },
      fail: uploadErr => {
        console.error('上传失败:', uploadErr)
        wx.hideLoading()
        that.setData({ loading: false })
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        })
      }
    })
  }
})
