const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')
const { formatDotDate } = require('../../utils/date')
const { isProfileSignedIn, signInProfile } = require('../../utils/profileSession')

const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }
const PROFILE_REFRESH_INTERVAL_MS = 30 * 60 * 1000

Page({
  data: {
    signedOut: false,
    loggingIn: false,
    profileLoading: true,
    authorized: false,
    authorizing: false,
    savingProfile: false,
    nicknameFocused: false,
    profile: {},
    loading: false,
    works: [],
    totalWorks: 0,
    errorMessage: ''
  },

  onShow() {
    if (!isProfileSignedIn()) {
      this.profileResolved = false
      this.setData({
        signedOut: true, profileLoading: false, authorized: false, profile: {},
        works: [], totalWorks: 0, loading: false, errorMessage: ''
      })
      return
    }
    if (this.data.signedOut) this.setData({ signedOut: false })
    if (this.profileLoadPromise) return this.profileLoadPromise
    if (!this.profileResolved || Date.now() - this.profileConfirmedAt >= PROFILE_REFRESH_INTERVAL_MS) return this.loadProfile()
    return this.loadRecentWorks()
  },

  loadProfile() {
    if (this.profileLoadPromise) return this.profileLoadPromise
    const needsInitialLoading = !this.profileResolved
    if (needsInitialLoading) this.setData({ profileLoading: true })
    this.profileLoadPromise = (async () => {
      try {
        const response = await callFunctionWithTimeout('userProfile', { action: 'get' })
        if (!isProfileSignedIn()) return
        if (!response.result?.ok) throw new Error(response.result?.message || '登录状态确认失败，请稍后再试。')
        const { authorized, profile } = response.result.data || {}
        this.setData({ authorized: Boolean(authorized), profile: profile || {} })
        this.profileResolved = true
        this.profileConfirmedAt = Date.now()
      } catch (error) {
        console.error('读取用户资料失败:', error)
        if (!this.profileResolved) this.setData({ authorized: false })
        showErrorToast(error, '登录状态确认失败，请稍后再试。')
      } finally {
        if (isProfileSignedIn()) await this.loadRecentWorks()
        if (needsInitialLoading) this.setData({ profileLoading: false })
        this.profileLoadPromise = null
      }
    })()
    return this.profileLoadPromise
  },

  onNicknameInput(event) {
    const nickName = String(event.detail?.value || '').slice(0, 40)
    this.setData({ 'profile.nickName': nickName })
  },

  focusNickname() {
    if (!this.data.nicknameFocused) this.setData({ nicknameFocused: true })
  },

  async onNicknameBlur(event) {
    const nickName = String(event.detail?.value || '').trim()
    this.setData({ nicknameFocused: false })
    if (!nickName) return
    this.setData({ 'profile.nickName': nickName })
    await this.saveProfile({ nickName })
  },

  async onChooseAvatar(event) {
    const filePath = event.detail?.avatarUrl
    if (!filePath || this.data.authorizing) return
    this.setData({ authorizing: true })
    try {
      const targetResponse = await callFunctionWithTimeout('userProfile', { action: 'createAvatarUpload' })
      if (!targetResponse.result?.ok || !targetResponse.result.data?.cloudPath) throw new Error(targetResponse.result?.message || '头像上传任务创建失败，请稍后再试。')
      const uploadResult = await wx.cloud.uploadFile({ cloudPath: targetResponse.result.data.cloudPath, filePath })
      if (!uploadResult?.fileID) throw new Error('头像上传失败，请稍后再试。')
      await this.saveProfile({ avatarFileId: uploadResult.fileID })
      if (!this.data.profile.nickName) this.setData({ nicknameFocused: true })
    } catch (error) {
      console.error('微信头像授权失败:', error)
      showErrorToast(error, '头像授权失败，请稍后再试。')
    } finally {
      this.setData({ authorizing: false })
    }
  },

  async saveProfile(changes) {
    this.pendingProfileChanges = { ...this.pendingProfileChanges, ...changes }
    if (this.profileSavePromise) return this.profileSavePromise

    this.profileSavePromise = (async () => {
      let authorized = this.data.authorized
      this.setData({ savingProfile: true })
      try {
        while (Object.keys(this.pendingProfileChanges).length) {
          const profileChanges = this.pendingProfileChanges
          this.pendingProfileChanges = {}
          const response = await callFunctionWithTimeout('userProfile', { action: 'save', profile: profileChanges })
          if (!response.result?.ok) throw new Error(response.result?.message || '登录资料保存失败，请稍后再试。')
          authorized = Boolean(response.result.data?.authorized)
          this.profileResolved = true
          this.profileConfirmedAt = Date.now()
          this.setData({
            authorized,
            profile: { ...(response.result.data?.profile || {}), ...this.pendingProfileChanges }
          })
        }
        await this.loadRecentWorks()
      } catch (error) {
        console.error('微信资料保存失败:', error)
        showErrorToast(error, '资料保存失败，请稍后再试。')
      } finally {
        this.setData({ savingProfile: false })
        this.profileSavePromise = null
      }
    })()
    return this.profileSavePromise
  },

  async loadRecentWorks() {
    if (!isProfileSignedIn()) return
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('listWorks', { limit: 8 })
      if (!isProfileSignedIn()) return
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品失败')
      const works = (response.result.data?.works || []).map((work) => ({
        ...work,
        typeTitle: TYPE_TITLE[work.type] || '创作结果',
        createdLabel: formatDotDate(work.createdAt)
      }))
      this.setData({ works, totalWorks: Number(response.result.data?.total || works.length) })
    } catch (error) {
      console.error('读取最近作品失败:', error)
      this.setData({ errorMessage: error.message || '读取作品失败，请稍后重试。' })
      showErrorToast(error, '读取作品失败，请稍后重试。')
    } finally {
      this.setData({ loading: false })
    }
  },

  async loginProfile() {
    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    try {
      await new Promise((resolve, reject) => wx.login({
        success: (result) => result?.code ? resolve() : reject(new Error('微信登录失败，请重试。')),
        fail: reject
      }))
      const response = await callFunctionWithTimeout('userProfile', { action: 'get' })
      if (!response.result?.ok) throw new Error(response.result?.message || '微信身份确认失败，请重试。')
      signInProfile()
      const { authorized, profile } = response.result.data || {}
      this.profileResolved = true
      this.profileConfirmedAt = Date.now()
      this.setData({ signedOut: false, profileLoading: false, authorized: Boolean(authorized), profile: profile || {} })
      await this.loadRecentWorks()
    } catch (error) {
      showErrorToast(error, '微信登录失败，请稍后重试。')
    } finally {
      this.setData({ loggingIn: false })
    }
  },

  openWork(event) { const workId = event.currentTarget.dataset.workId; if (workId) wx.navigateTo({ url: `/pages/result/result?workId=${workId}` }) },
  openAllWorks() { if (isProfileSignedIn()) wx.navigateTo({ url: '/pages/works/works' }) },
  openSettings() { wx.navigateTo({ url: '/pages/settings/settings' }) },
  startCreation() { wx.switchTab({ url: '/pages/index/index' }) }
})
