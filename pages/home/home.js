const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { formatDotDate } = require('../../utils/date')

Page({
  data: { posts: [], blogLoading: true, blogError: '' },

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    this.loadLatestPosts()
  },

  async loadLatestPosts() {
    this.setData({ blogLoading: true, blogError: '' })
    try {
      const response = await callFunctionWithTimeout('getBlogPosts', { page: 1, pageSize: 3 })
      if (!response.result?.ok) throw new Error(response.result?.message || '博客暂时无法加载，请稍后再试。')
      const posts = (response.result.data?.posts || []).map((post) => ({ ...post, publishedLabel: formatDotDate(post.publishedAt) }))
      this.setData({ posts })
    } catch (error) {
      console.error('加载首页博客失败:', error)
      this.setData({ blogError: error.message || '博客暂时无法加载，请稍后再试。' })
    } finally {
      this.setData({ blogLoading: false })
    }
  },

  startCreation() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  openBlogList() {
    wx.navigateTo({ url: '/pages/blog/blog' })
  },

  openPost(event) {
    const postId = event.currentTarget.dataset.postId
    if (postId) wx.navigateTo({ url: `/pages/blog-detail/blog-detail?postId=${postId}` })
  },

  onShareAppMessage() {
    return {
      title: '照片有话说，把此刻写下来',
      path: '/pages/home/home'
    }
  },

  onShareTimeline() {
    return { title: '照片有话说，把此刻写下来' }
  }
})
