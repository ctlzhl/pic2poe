const { callFunctionWithTimeout, downloadFileWithTimeout } = require('../../utils/requestHelper')
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
    typeTitle: '',
    isShared: false,
    shareToken: '',
    shareTitle: '照片有话说',
    shareImageUrl: '',
    shareLoading: false,
    shareError: ''
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
      this.shareImageTempPath = ''
    } catch (error) {
      console.error('生成分享图失败:', error)
      this.setData({ shareError: error.message || '分享图生成失败，请重试。' })
    } finally {
      this.setData({ shareLoading: false })
    }
  },

  async getShareImageTempPath() {
    if (this.shareImageTempPath) return this.shareImageTempPath
    if (!this.data.shareImageUrl) throw new Error('分享图正在生成，请稍候')

    const download = await downloadFileWithTimeout(this.data.shareImageUrl)
    if (download.statusCode && (download.statusCode < 200 || download.statusCode >= 300)) {
      throw new Error('分享图下载失败')
    }
    this.shareImageTempPath = download.tempFilePath
    return this.shareImageTempPath
  },

  async openNativeShareMenu() {
    if (!this.data.shareImageUrl) {
      if (!this.data.shareLoading) {
        this.prepareShareCard()
      }
      wx.showToast({ title: '分享图正在准备，请稍候', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在打开…', mask: true })
    try {
      const tempFilePath = await this.getShareImageTempPath()
      if (typeof wx.showShareImageMenu !== 'function') throw new Error('当前微信版本暂不支持图片分享')
      await new Promise((resolve, reject) => {
        wx.showShareImageMenu({
          path: tempFilePath,
          success: resolve,
          fail: (error) => reject(new Error(error?.errMsg || '图片分享菜单暂不可用'))
        })
      })
    } catch (error) {
      console.error('打开原生图片分享菜单失败:', error)
      showErrorToast(error, '图片分享暂不可用，请在真机预览中重试。')
    } finally {
      wx.hideLoading()
    }
  },

  createAgain() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  async rewriteSameImage() {
    if (!this.data.workId) return
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
