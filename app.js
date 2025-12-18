const ENV_ID = 'cloud1-8gefec0p0d1f809d'

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('基础库过低，请升级到 2.2.3 及以上以使用云能力')
      return
    }

    wx.cloud.init({
      env: ENV_ID,
      traceUser: true
    })

    this.globalData = {
      poemResult: null,
      sharePosterMeta: null,
      shouldResetSelection: false,
      shouldAutoChooseImage: false
    }
  }
})
