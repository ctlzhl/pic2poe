const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }

const formatDate = (timestamp) => {
  const date = new Date(timestamp || 0)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    profileLoading: true,
    authorized: false,
    authorizing: false,
    profile: {},
    loading: false,
    works: [],
    totalWorks: 0,
    errorMessage: ''
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({ profileLoading: true })
    try {
      const response = await callFunctionWithTimeout('userProfile', { action: 'get' })
      if (!response.result?.ok) throw new Error(response.result?.message || '登录状态确认失败，请稍后再试。')
      const { authorized, profile } = response.result.data || {}
      this.setData({ authorized: Boolean(authorized), profile: profile || {} })
      if (authorized) await this.loadRecentWorks()
    } catch (error) {
      console.error('读取用户资料失败:', error)
      this.setData({ authorized: false })
      showErrorToast(error, '登录状态确认失败，请稍后再试。')
    } finally {
      this.setData({ profileLoading: false })
    }
  },

  async authorizeProfile() {
    if (this.data.authorizing) return
    if (typeof wx.getUserProfile !== 'function') {
      wx.showToast({ title: '当前微信版本暂不支持资料授权', icon: 'none' })
      return
    }
    this.setData({ authorizing: true })
    try {
      const result = await wx.getUserProfile({ desc: '用于展示你的创作资料' })
      const response = await callFunctionWithTimeout('userProfile', { action: 'save', profile: result.userInfo })
      if (!response.result?.ok) throw new Error(response.result?.message || '登录资料保存失败，请稍后再试。')
      this.setData({ authorized: true, profile: response.result.data.profile || {} })
      await this.loadRecentWorks()
    } catch (error) {
      if (error?.errMsg?.includes('deny') || error?.errMsg?.includes('cancel')) return
      console.error('微信资料授权失败:', error)
      showErrorToast(error, '微信授权失败，请稍后再试。')
    } finally {
      this.setData({ authorizing: false })
    }
  },

  async loadRecentWorks() {
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('listWorks', { limit: 8 })
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品失败')
      const works = (response.result.data?.works || []).map((work) => ({
        ...work,
        typeTitle: TYPE_TITLE[work.type] || '创作结果',
        createdLabel: formatDate(work.createdAt)
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

  openWork(event) { const workId = event.currentTarget.dataset.workId; if (workId) wx.navigateTo({ url: `/pages/result/result?workId=${workId}` }) },
  openAllWorks() { wx.navigateTo({ url: '/pages/works/works' }) },
  openSettings() { wx.navigateTo({ url: '/pages/settings/settings' }) },
  startCreation() { wx.switchTab({ url: '/pages/index/index' }) }
})
