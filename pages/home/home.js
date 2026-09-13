Page({
  startCreation() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  openMyWorks() {
    wx.switchTab({ url: '/pages/my/my' })
  }
})
