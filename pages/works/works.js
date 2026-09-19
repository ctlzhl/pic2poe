const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')
const { formatDotDate } = require('../../utils/date')

const TYPE_TITLE = { poem: '五言绝句', review: '图片点评', copy: '配图文案' }

Page({
  data: {
    loading: true,
    works: [],
    errorMessage: '',
    deletingWorkId: '',
    page: 1,
    totalPages: 1
  },

  onShow() {
    this.loadWorks(1)
  },

  async loadWorks(page = 1) {
    if (this.loadingWorks) return
    this.loadingWorks = true
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('listWorks', { page, limit: 10 })
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品列表失败')
      const works = (response.result.data?.works || []).map((work) => ({
        ...work,
        typeTitle: TYPE_TITLE[work.type] || '创作结果',
        createdLabel: formatDotDate(work.createdAt)
      }))
      this.setData({
        works,
        page: Number(response.result.data?.page || 1),
        totalPages: Number(response.result.data?.totalPages || 1)
      })
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
    this.loadWorks(1)
  },

  previousPage() {
    if (this.data.page > 1) this.loadWorks(this.data.page - 1)
  },

  nextPage() {
    if (this.data.page < this.data.totalPages) this.loadWorks(this.data.page + 1)
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
      wx.showToast({ title: '作品已删除', icon: 'success' })
      const nextPage = this.data.works.length === 1 && this.data.page > 1 ? this.data.page - 1 : this.data.page
      await this.loadWorks(nextPage)
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
