const { callFunctionWithTimeout } = require('../../utils/requestHelper')

const formatDate = (timestamp) => {
  const date = new Date(timestamp || 0)
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

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

  onLoad() { this.loadCategories(); this.loadMore() },

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

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    const page = this.data.page + 1
    this.setData({ loading: true, errorMessage: '' })
    try {
      const payload = { page, pageSize: 10 }
      if (this.data.selectedCategoryId) payload.categoryId = this.data.selectedCategoryId
      const response = await callFunctionWithTimeout('getBlogPosts', payload)
      if (!response.result?.ok) throw new Error(response.result?.message || '博客暂时无法加载，请稍后再试。')
      const posts = (response.result.data?.posts || []).map((post) => ({ ...post, publishedLabel: formatDate(post.publishedAt) }))
      this.setData({ posts: this.data.posts.concat(posts), page, hasMore: Boolean(response.result.data?.hasMore) })
    } catch (error) {
      console.error('加载博客列表失败:', error)
      this.setData({ errorMessage: error.message || '博客暂时无法加载，请稍后再试。' })
    } finally {
      this.setData({ loading: false })
    }
  },

  selectCategory(event) {
    const categoryId = Number(event.currentTarget.dataset.categoryId) || ''
    if (categoryId === this.data.selectedCategoryId) return
    this.setData({ selectedCategoryId: categoryId, posts: [], page: 0, hasMore: true, errorMessage: '' })
    this.loadMore()
  },
  reload() { this.setData({ posts: [], page: 0, hasMore: true }); this.loadMore() },
  openPost(event) { const postId = event.currentTarget.dataset.postId; if (postId) wx.navigateTo({ url: `/pages/blog-detail/blog-detail?postId=${postId}` }) }
})
