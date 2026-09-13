Page({
  data: {
    cameraAuthorized: false,
    albumAuthorized: false
  },

  onShow() {
    wx.getSetting({
      success: (result) => {
        const auth = result.authSetting || {}
        this.setData({
          cameraAuthorized: auth['scope.camera'] === true,
          albumAuthorized: auth['scope.writePhotosAlbum'] === true
        })
      }
    })
  },

  openSystemSettings() {
    wx.openSetting({})
  },

  openPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  openWorks() {
    wx.navigateTo({ url: '/pages/works/works' })
  }
})
