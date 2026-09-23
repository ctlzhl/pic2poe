const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { formatDotDate } = require('../../utils/date')

const getShareTitle = (post = {}) => post.title ? `${post.title}｜照片有话说` : '随便看看｜照片有话说'

Page({
  data: { postId: '', post: {}, loading: true, errorMessage: '' },
  onLoad(options) {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    this.setData({ postId: options.postId || '' })
    this.loadPost()
  },
  async loadPost() {
    if (!this.data.postId) return this.setData({ loading: false, errorMessage: '文章不存在或已下线。' })
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('getBlogPosts', { action: 'detail', postId: this.data.postId })
      if (!response.result?.ok) throw new Error(response.result?.message || '文章暂时无法加载，请稍后再试。')
      const post = response.result.data?.post || {}
      this.setData({ post: { ...post, publishedLabel: formatDotDate(post.publishedAt) } })
    } catch (error) {
      console.error('加载文章详情失败:', error)
      this.setData({ errorMessage: error.message || '文章暂时无法加载，请稍后再试。' })
    } finally { this.setData({ loading: false }) }
  },

  onShareAppMessage() {
    const postId = encodeURIComponent(this.data.postId || '')
    return {
      title: getShareTitle(this.data.post),
      path: `/pages/blog-detail/blog-detail?postId=${postId}`,
      imageUrl: this.data.post?.featuredImage || undefined
    }
  },

  onShareTimeline() {
    const postId = encodeURIComponent(this.data.postId || '')
    return {
      title: getShareTitle(this.data.post),
      query: `postId=${postId}`,
      imageUrl: this.data.post?.featuredImage || undefined
    }
  }
})
