const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { formatDotDate } = require('../../utils/date')
const HOME_POSTS_CACHE_KEY = 'homeLatestPosts:v3'
// 云存储临时图片链接会过期，首页本地快照只用于短时间内的即时展示。
const HOME_POSTS_CACHE_MAX_AGE_MS = 30 * 60 * 1000

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
    try {
      const cached = wx.getStorageSync(HOME_POSTS_CACHE_KEY)
      if (cached && Array.isArray(cached.posts) && cached.posts.length &&
        Number.isFinite(cached.savedAt) && Date.now() - cached.savedAt < HOME_POSTS_CACHE_MAX_AGE_MS) {
        this.setData({ posts: cached.posts.map((post) => ({ ...post, publishedLabel: formatDotDate(post.publishedAt) })) })
      }
    } catch (error) {
      console.warn('读取首页文章缓存失败:', error)
    }
    this.setData({ blogLoading: !this.data.posts.length, blogError: '' })
    try {
      const response = await callFunctionWithTimeout('getBlogPosts', { page: 1, pageSize: 3 })
      if (!response.result?.ok) throw new Error(response.result?.message || '博客暂时无法加载，请稍后再试。')
      const rawPosts = response.result.data?.posts || []
      const posts = rawPosts.map((post) => ({ ...post, publishedLabel: formatDotDate(post.publishedAt) }))
      this.setData({ posts })
      try {
        wx.setStorageSync(HOME_POSTS_CACHE_KEY, { savedAt: Date.now(), posts: rawPosts })
      } catch (error) {
        console.warn('保存首页文章缓存失败:', error)
      }
    } catch (error) {
      console.error('加载首页博客失败:', error)
      if (!this.data.posts.length) this.setData({ blogError: error.message || '博客暂时无法加载，请稍后再试。' })
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

  onCoverError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isInteger(index) && index >= 0 && this.data.posts[index]?.featuredImage) {
      this.setData({ [`posts[${index}].featuredImage`]: '' })
    }
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
