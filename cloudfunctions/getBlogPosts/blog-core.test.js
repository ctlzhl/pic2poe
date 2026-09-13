const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./blog-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('normalizePost 清洗 WordPress HTML 并提取文章展示字段', () => {
  const { normalizePost } = loadCore()
  assert.equal(typeof normalizePost, 'function')

  const post = normalizePost({
    id: 12,
    date: '2026-09-14T09:30:00',
    title: { rendered: '<em>秋日</em>&amp;光' },
    excerpt: { rendered: '<p>一段 <strong>被保留</strong> 的摘要。</p><script>alert(1)</script>' },
    content: { rendered: '<h2>标题</h2><p>正文 <a href="javascript:alert(1)">链接</a></p><iframe src="bad"></iframe>' },
    _embedded: {
      'wp:featuredmedia': [{ source_url: 'https://cdn.example.com/post.jpg' }],
      'wp:term': [[{ name: '旅行' }]]
    }
  })

  assert.deepEqual(post, {
    id: 12,
    title: '秋日&光',
    excerpt: '一段 被保留 的摘要。',
    contentHtml: '<h2>标题</h2><p>正文 <a>链接</a></p>',
    featuredImage: 'https://cdn.example.com/post.jpg',
    categoryName: '旅行',
    publishedAt: '2026-09-14T09:30:00'
  })
})
