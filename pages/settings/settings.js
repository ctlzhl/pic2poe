const { signOutProfile } = require('../../utils/profileSession')

Page({
  openPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  openWorks() {
    wx.navigateTo({ url: '/pages/works/works' })
  },

  async signOut() {
    const confirmation = await new Promise((resolve) => wx.showModal({
      title: '退出登录？',
      content: '退出后本机不再展示个人资料和作品；不会删除任何数据，再次登录即可恢复。',
      confirmText: '退出',
      success: resolve,
      fail: () => resolve({ confirm: false })
    }))
    if (!confirmation.confirm) return
    try {
      signOutProfile()
      wx.switchTab({ url: '/pages/my/my' })
    } catch (error) {
      wx.showToast({ title: '退出失败，请重试', icon: 'none' })
    }
  }
})
