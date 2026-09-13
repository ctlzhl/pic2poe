const { callFunctionWithTimeout } = require('../../utils/requestHelper')

const formatDate = (timestamp) => {
  const date = new Date(timestamp || 0)
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

Page({
  data: { postId: '', post: {}, loading: true, errorMessage: '' },
  onLoad(options) { this.setData({ postId: options.postId || '' }); this.loadPost() },
  async loadPost() {
    if (!this.data.postId) return this.setData({ loading: false, errorMessage: '文章不存在或已下线。' })
    this.setData({ loading: true, errorMessage: '' })
    try {
      const response = await callFunctionWithTimeout('getBlogPosts', { action: 'detail', postId: this.data.postId })
      if (!response.result?.ok) throw new Error(response.result?.message || '文章暂时无法加载，请稍后再试。')
      const post = response.result.data?.post || {}
      this.setData({ post: { ...post, publishedLabel: formatDate(post.publishedAt) } })
    } catch (error) {
      console.error('加载文章详情失败:', error)
      this.setData({ errorMessage: error.message || '文章暂时无法加载，请稍后再试。' })
    } finally { this.setData({ loading: false }) }
  },
  startCreation() { wx.switchTab({ url: '/pages/index/index' }) }
})
