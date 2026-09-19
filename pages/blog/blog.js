const { callFunctionWithTimeout } = require('../../utils/requestHelper')
const { formatDotDate } = require('../../utils/date')

Page({
  data: {
    posts: [],
    page: 0,
    hasMore: true,
    loading: false,
    errorMessage: '',
    categories: [{ id: '', name: '全部' }],
    selectedCategoryId: ''
  },

  onLoad() {
    this.requestVersion = 1
    this.loadCategories()
    this.loadMore({ requestVersion: this.requestVersion })
  },

  async loadCategories() {
    try {
      const response = await callFunctionWithTimeout('getBlogPosts', { action: 'categories' })
      if (!response.result?.ok) throw new Error(response.result?.message || '分类暂时无法加载。')
      const categories = (response.result.data?.categories || []).map((category) => ({ id: Number(category.id), name: category.name }))
      this.setData({ categories: [{ id: '', name: '全部' }].concat(categories.filter((category) => category.id > 0 && category.name)) })
    } catch (error) {
      console.error('加载博客分类失败:', error)
    }
  },

  async loadMore({ force = false, requestVersion = this.requestVersion || 0 } = {}) {
    if ((!force && this.data.loading) || !this.data.hasMore) return
    const page = this.data.page + 1
    const categoryId = this.data.selectedCategoryId
    this.setData({ loading: true, errorMessage: '' })
    try {
      const payload = { page, pageSize: 10 }
      if (categoryId) payload.categoryId = categoryId
      const response = await callFunctionWithTimeout('getBlogPosts', payload)
      if (!response.result?.ok) throw new Error(response.result?.message || '博客暂时无法加载，请稍后再试。')
      if (requestVersion !== this.requestVersion || categoryId !== this.data.selectedCategoryId) return
      const posts = (response.result.data?.posts || []).map((post) => ({ ...post, publishedLabel: formatDotDate(post.publishedAt) }))
      this.setData({ posts: this.data.posts.concat(posts), page, hasMore: Boolean(response.result.data?.hasMore) })
    } catch (error) {
      if (requestVersion !== this.requestVersion) return
      console.error('加载博客列表失败:', error)
      this.setData({ errorMessage: error.message || '博客暂时无法加载，请稍后再试。' })
    } finally {
      if (requestVersion === this.requestVersion) this.setData({ loading: false })
    }
  },

  selectCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId) || ''
    if (categoryId === this.data.selectedCategoryId) return
    const requestVersion = (this.requestVersion || 0) + 1
    this.requestVersion = requestVersion
    this.setData({ selectedCategoryId: categoryId, posts: [], page: 0, hasMore: true, loading: false, errorMessage: '' })
    this.loadMore({ force: true, requestVersion })
  },
  reload() {
    const requestVersion = (this.requestVersion || 0) + 1
    this.requestVersion = requestVersion
    this.setData({ posts: [], page: 0, hasMore: true, loading: false })
    this.loadMore({ force: true, requestVersion })
  },
  openPost(event) { const postId = event.currentTarget.dataset.postId; if (postId) wx.navigateTo({ url: `/pages/blog-detail/blog-detail?postId=${postId}` }) }
})
