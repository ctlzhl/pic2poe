const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }

const formatDate = (timestamp) => {
  const date = new Date(timestamp || 0)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: { loading: true, works: [], totalWorks: 0, errorMessage: '' },

  onShow() {
    this.loadRecentWorks()
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

  openWork(event) {
    const workId = event.currentTarget.dataset.workId
    if (workId) wx.navigateTo({ url: `/pages/result/result?workId=${workId}` })
  },

  openAllWorks() {
    wx.navigateTo({ url: '/pages/works/works' })
  },

  openSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  startCreation() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
