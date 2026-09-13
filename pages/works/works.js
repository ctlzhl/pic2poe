const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    loading: true,
    works: [],
    errorMessage: '',
    deletingWorkId: ''
  },

  onShow() {
    this.loadWorks()
  },

  async loadWorks() {
    if (this.loadingWorks) return
    this.loadingWorks = true
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('listWorks')
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品列表失败')
      const works = (response.result.data?.works || []).map((work) => ({
        ...work,
        typeTitle: TYPE_TITLE[work.type] || '创作结果',
        createdLabel: formatDate(work.createdAt)
      }))
      this.setData({ works })
    } catch (error) {
      console.error('读取作品列表失败:', error)
      this.setData({ errorMessage: error.message || '读取作品列表失败，请稍后重试。' })
      showErrorToast(error, '读取作品列表失败，请稍后重试。')
    } finally {
      this.loadingWorks = false
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  onPullDownRefresh() {
    this.loadWorks()
  },

  openWork(event) {
    const workId = event.currentTarget.dataset.workId
    if (workId) wx.navigateTo({ url: `/pages/result/result?workId=${workId}` })
  },

  async deleteWork(event) {
    const workId = event.currentTarget.dataset.workId
    if (!workId || this.data.deletingWorkId) return
    const confirmation = await new Promise((resolve) => wx.showModal({
      title: '删除这份作品？',
      content: '关联图片、分享图和分享链接都会失效，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#b65a4d',
      success: resolve
    }))
    if (!confirmation.confirm) return

    this.setData({ deletingWorkId: workId })
    try {
      const response = await callFunctionWithTimeout('deleteWork', { workId })
      if (!response.result?.ok) throw new Error(response.result?.message || '删除作品失败')
      this.setData({ works: this.data.works.filter((work) => work.workId !== workId) })
      wx.showToast({ title: '作品已删除', icon: 'success' })
    } catch (error) {
      console.error('删除作品失败:', error)
      showErrorToast(error, '删除作品失败，请稍后重试。')
    } finally {
      this.setData({ deletingWorkId: '' })
    }
  },

  createAgain() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
