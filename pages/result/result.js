const { callFunctionWithTimeout, downloadFileWithTimeout } = require('../../utils/requestHelper')
const { showErrorToast } = require('../../utils/errorHandler')

const SHARE_TIMEOUT = 55000

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
    isShared: false,
    shareToken: '',
    shareTitle: '照片有话说',
    shareImageUrl: '',
    shareLoading: false,
    shareError: '',
    photoWidth: 686,
    photoHeight: 420
  },

  onPhotoLoad(event) {
    const width = Number(event.detail?.width)
    const height = Number(event.detail?.height)
    if (!(width > 0 && height > 0)) return
    const photoHeight = Math.min(640, Math.max(1, Math.round(686 * height / width)))
    this.setData({ photoWidth: Math.min(686, Math.round(photoHeight * width / height)), photoHeight })
  },

  previewPhoto() {
    const imageUrl = this.data.work?.imageUrl
    if (imageUrl) wx.previewImage({ current: imageUrl, urls: [imageUrl] })
  },

  onLoad(options) {
    const shareToken = parseShareToken(options)
    if (shareToken) {
      this.enableShareMenu()
      this.loadSharedWork(shareToken)
      return
    }

    if (typeof wx.hideShareMenu === 'function') {
      wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
    }

    const workId = options.workId || ''
    if (!workId) {
      this.setData({ loading: false, hasError: true, errorMessage: '未获取到作品，请返回重试。' })
      return
    }
    this.loadWork(workId)
  },

  enableShareMenu() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  async loadWork(workId) {
    try {
      const response = await callFunctionWithTimeout('getWork', { workId })
      if (!response.result?.ok) throw new Error(response.result?.message || '读取作品失败')
      const work = response.result.data
      this.setData({
        loading: false,
        work,
        workId
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
        work
      })
    } catch (error) {
      console.error('读取分享内容失败:', error)
      this.setData({ loading: false, hasError: true, errorMessage: error.message || '分享内容暂不可用。' })
      showErrorToast(error, '分享内容暂不可用。')
    }
  },

  async prepareShareCard(workId = this.data.workId) {
    if (!workId || this.data.isShared) return ''
    if (this.data.shareImageUrl) return this.data.shareImageUrl
    if (this.shareCardPromise) return this.shareCardPromise

    this.setData({ shareLoading: true, shareError: '' })
    const task = (async () => {
      try {
        const response = await callFunctionWithTimeout('createShareCard', { workId }, SHARE_TIMEOUT)
        if (!response.result?.ok) {
          console.error('createShareCard 返回失败:', response.result)
          throw new Error(response.result?.message || '分享图生成失败')
        }
        const share = response.result.data
        if (!share?.shareToken || !share?.shareImageUrl) throw new Error('分享图生成结果不完整，请重试。')
        this.setData({
          shareToken: share.shareToken,
          shareImageUrl: share.shareImageUrl,
          shareTitle: share.shareTitle || '照片有话说'
        })
        this.shareImageTempPath = ''
        if (share.shareToken) this.enableShareMenu()
        if (share.shareImageUrl && typeof wx.downloadFile === 'function') {
          this.getShareImageTempPath().catch((error) => {
            console.warn('分享图预下载失败，将在用户点击时重试:', error)
          })
        }
        return share.shareImageUrl
      } catch (error) {
        console.error('生成分享图失败:', error)
        this.setData({ shareError: error.message || '分享图生成失败，请重试。' })
        return ''
      } finally {
        this.setData({ shareLoading: false })
      }
    })()

    this.shareCardPromise = task
    try {
      return await task
    } finally {
      if (this.shareCardPromise === task) this.shareCardPromise = null
    }
  },

  async getShareImageTempPath() {
    if (this.shareImageTempPath) return this.shareImageTempPath
    if (this.shareImageDownloadPromise) return this.shareImageDownloadPromise
    if (!this.data.shareImageUrl) throw new Error('分享图正在生成，请稍候')

    const task = (async () => {
      const download = await downloadFileWithTimeout(this.data.shareImageUrl)
      if (!download.tempFilePath || (download.statusCode && (download.statusCode < 200 || download.statusCode >= 300))) {
        throw new Error('分享图下载失败')
      }
      this.shareImageTempPath = download.tempFilePath
      return this.shareImageTempPath
    })()
    this.shareImageDownloadPromise = task
    try {
      return await task
    } finally {
      if (this.shareImageDownloadPromise === task) this.shareImageDownloadPromise = null
    }
  },

  async openNativeShareMenu() {
    if (this.openingShareMenu) return this.openingShareMenu
    const task = this.showNativeShareMenu()
    this.openingShareMenu = task
    try {
      return await task
    } finally {
      if (this.openingShareMenu === task) this.openingShareMenu = null
    }
  },

  async showNativeShareMenu() {
    wx.showLoading({ title: '正在打开…', mask: true })
    try {
      if (!this.data.shareImageUrl) {
        const shareImageUrl = await this.prepareShareCard()
        if (!shareImageUrl || !this.data.shareImageUrl) {
          throw new Error(this.data.shareError || '分享图生成失败，请稍后重试。')
        }
      }

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
      const preview = encodeURIComponent(this.data.work?.imageUrl || '')
      const type = this.data.work?.type || ''
      wx.redirectTo({ url: `/pages/creating/creating?taskId=${response.result.data.taskId}&type=${type}&preview=${preview}` })
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
