const { callFunctionWithTimeout, downloadFileWithTimeout, saveToAlbumWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const SHARE_TIMEOUT = 55000
const TYPE_TITLE = {
  poem: '五言绝句',
  review: '图片点评',
  copy: '配图文案'
}

const parseShareToken = (options = {}) => {
  if (typeof options.shareToken === 'string' && options.shareToken) return options.shareToken
  if (typeof options.scene !== 'string' || !options.scene) return ''
  const scene = decodeURIComponent(options.scene)
  const match = scene.match(/(?:^|&)s=([A-Za-z0-9_-]{20,32})(?:&|$)/)
  return match ? match[1] : ''
}

Page({
  data: {
    loading: true,
    hasError: false,
    errorMessage: '',
    work: null,
    workId: '',
    isFresh: false,
    typeTitle: '',
    isShared: false,
    shareToken: '',
    shareTitle: '照片有话说',
    shareImageUrl: '',
    shareLoading: false,
    shareError: '',
    deleting: false
  },

  onLoad(options) {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    const shareToken = parseShareToken(options)
    if (shareToken) {
      this.loadSharedWork(shareToken)
      return
    }

    const workId = options.workId || ''
    if (!workId) {
      this.setData({ loading: false, hasError: true, errorMessage: '未获取到作品，请返回重试。' })
      return
    }
    this.setData({ isFresh: options.fresh === '1' })
    this.loadWork(workId)
  },

  async loadWork(workId) {
    try {
      const response = await callFunctionWithTimeout('getWork', { workId })
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品失败')
      const work = response.result.data
      this.setData({
        loading: false,
        work,
        workId,
        typeTitle: TYPE_TITLE[work.type] || '创作结果'
      })
      this.prepareShareCard(workId)
    } catch (error) {
      console.error('读取作品失败:', error)
      this.setData({ loading: false, hasError: true, errorMessage: error.message || '读取作品失败，请稍后重试。' })
      showErrorToast(error, '读取作品失败，请稍后重试。')
    }
  },

  async loadSharedWork(shareToken) {
    try {
      const response = await callFunctionWithTimeout('getSharedWork', { shareToken })
      if (!response.result?.ok) throw new Error(response.result?.message || '读取分享内容失败')
      const work = response.result.data
      this.setData({
        loading: false,
        isShared: true,
        shareToken,
        shareTitle: work.shareTitle || '照片有话说',
        shareImageUrl: work.shareImageUrl || '',
        work,
        typeTitle: TYPE_TITLE[work.type] || '创作结果'
      })
    } catch (error) {
      console.error('读取分享内容失败:', error)
      this.setData({ loading: false, hasError: true, errorMessage: error.message || '分享内容暂不可用。' })
      showErrorToast(error, '分享内容暂不可用。')
    }
  },

  async prepareShareCard(workId = this.data.workId) {
    if (!workId || this.data.isShared || this.data.shareLoading) return
    this.setData({ shareLoading: true, shareError: '' })
    try {
      const response = await callFunctionWithTimeout('createShareCard', { workId }, SHARE_TIMEOUT)
      if (!response.result?.ok) {
        console.error('createShareCard 返回失败:', response.result)
        throw new Error(response.result?.message || '分享图生成失败')
      }
      const share = response.result.data
      this.setData({
        shareToken: share.shareToken,
        shareImageUrl: share.shareImageUrl,
        shareTitle: share.shareTitle || '照片有话说'
      })
    } catch (error) {
      console.error('生成分享图失败:', error)
      this.setData({ shareError: error.message || '分享图生成失败，请重试。' })
    } finally {
      this.setData({ shareLoading: false })
    }
  },

  retryShareCard() {
    this.prepareShareCard()
  },

  async saveShareImage() {
    if (!this.data.shareImageUrl) {
      wx.showToast({ title: '分享图正在生成，请稍候', icon: 'none' })
      return
    }
    wx.showLoading({ title: '正在保存…', mask: true })
    try {
      const download = await downloadFileWithTimeout(this.data.shareImageUrl)
      if (download.statusCode && (download.statusCode < 200 || download.statusCode >= 300)) {
        throw new Error('分享图下载失败')
      }
      await saveToAlbumWithTimeout(download.tempFilePath)
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (error) {
      console.error('保存分享图失败:', error)
      showErrorToast(error, '保存失败，请允许访问相册后重试。')
    } finally {
      wx.hideLoading()
    }
  },

  showShareTimelineHint() {
    if (!this.data.shareToken) {
      this.prepareShareCard()
      wx.showToast({ title: '正在生成分享图，请稍候', icon: 'none' })
      return
    }
    wx.showToast({ title: '请从右上角菜单选择分享到朋友圈', icon: 'none', duration: 2800 })
  },

  async deleteWork() {
    if (this.data.isShared || this.data.deleting || !this.data.workId) return
    const confirmation = await new Promise((resolve) => wx.showModal({
      title: '删除这份作品？',
      content: '关联图片、分享图和分享链接都会失效，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#b65a4d',
      success: resolve
    }))
    if (!confirmation.confirm) return

    this.setData({ deleting: true })
    try {
      const response = await callFunctionWithTimeout('deleteWork', { workId: this.data.workId })
      if (!response.result?.ok) throw new Error(response.result?.message || '删除作品失败')
      wx.showToast({ title: '作品已删除', icon: 'success' })
      setTimeout(() => wx.redirectTo({ url: '/pages/works/works' }), 500)
    } catch (error) {
      console.error('删除作品失败:', error)
      showErrorToast(error, '删除作品失败，请稍后重试。')
      this.setData({ deleting: false })
    }
  },

  createAgain() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  async rewriteSameImage() {
    if (!this.data.isFresh || !this.data.workId || this.data.deleting) return
    wx.showLoading({ title: '正在重新开始…', mask: true })
    try {
      const response = await callFunctionWithTimeout('createCreation', {
        sourceWorkId: this.data.workId,
        idempotencyKey: `rewrite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      })
      if (!response.result?.ok) throw new Error(response.result?.message || '创建重写任务失败')
      wx.redirectTo({ url: `/pages/creating/creating?taskId=${response.result.data.taskId}` })
    } catch (error) {
      console.error('同图重写失败:', error)
      showErrorToast(error, '同图重写失败，请稍后再试。')
    } finally {
      wx.hideLoading()
    }
  },

  onShareAppMessage() {
    if (!this.data.shareToken) {
      return { title: '照片有话说，把此刻写下来', path: '/pages/index/index' }
    }
    return {
      title: this.data.shareTitle,
      path: `/pages/result/result?shareToken=${this.data.shareToken}`,
      imageUrl: this.data.shareImageUrl || undefined
    }
  },

  onShareTimeline() {
    if (!this.data.shareToken) return { title: '照片有话说，把此刻写下来' }
    return {
      title: this.data.shareTitle,
      query: `shareToken=${this.data.shareToken}`,
      imageUrl: this.data.shareImageUrl || undefined
    }
  }
})
