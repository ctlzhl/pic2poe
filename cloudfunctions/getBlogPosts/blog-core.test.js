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
    modified: '2026-09-15T10:00:00',
    title: { rendered: '<em>秋日</em>&amp;光' },
    excerpt: { rendered: '<p>一段 <strong>被保留</strong> 的摘要。</p><script>alert(1)</script>' },
    content: { rendered: '<h2>标题</h2><p>正文 <a href="javascript:alert(1)">链接</a></p><iframe src="bad"></iframe>' },
    _embedded: {
      'wp:featuredmedia': [{
        source_url: 'https://cdn.example.com/post-original.jpg',
        media_details: {
          sizes: {
            medium_large: { source_url: 'https://cdn.example.com/post-768.jpg' }
          }
        }
      }],
      'wp:term': [[{ name: '旅行' }]]
    }
  })

  assert.deepEqual(post, {
    id: 12,
    title: '秋日&光',
    excerpt: '一段 被保留 的摘要。',
    contentHtml: '<h2>标题</h2><p>正文 <a>链接</a></p>',
    featuredImage: 'https://cdn.example.com/post-768.jpg',
    categoryName: '旅行',
    categoryIds: [],
    publishedAt: '2026-09-14T09:30:00',
    modifiedAt: '2026-09-15T10:00:00'
  })
})

test('normalizePost 没有合适的缩略图时保留特色图原地址', () => {
  const { normalizePost } = loadCore()
  const post = normalizePost({
    id: 13,
    title: { rendered: '原图回退' },
    _embedded: { 'wp:featuredmedia': [{ source_url: 'https://cdn.example.com/post-original.jpg' }] }
  }, { includeContent: false })

  assert.equal(post.featuredImage, 'https://cdn.example.com/post-original.jpg')
})

test('列表文章没有特色图时使用正文首张安全图片并保留分类 ID', () => {
  const { normalizePost } = loadCore()
  const post = normalizePost({
    id: 14,
    title: { rendered: '正文配图' },
    content: { rendered: '<p>开头</p><img src="https://shengxiluo.me/uploads/cover.jpg"><img src="https://shengxiluo.me/uploads/other.jpg">' },
    categories: [7, 343],
    _embedded: { 'wp:term': [[{ id: 7, name: '摄影' }]] }
  }, { includeContent: false })

  assert.equal(post.featuredImage, 'https://shengxiluo.me/uploads/cover.jpg')
  assert.deepEqual(post.categoryIds, [7, 343])
  assert.equal(post.contentHtml, '')
})

test('sanitizeContentHtml 让正文图片按容器宽度等比例展示', () => {
  const { sanitizeContentHtml } = loadCore()
  assert.equal(typeof sanitizeContentHtml, 'function')

  const html = sanitizeContentHtml('<p>正文图片：</p><img src="https://cdn.example.com/article.jpg" alt="秋日湖面">')

  assert.equal(html, '<p>正文图片：</p><img src="https://cdn.example.com/article.jpg" alt="秋日湖面" style="width:100%;height:auto;display:block;">')
})

test('sanitizeContentHtml 移除正文开头重复的全文摘要', () => {
  const { sanitizeContentHtml } = loadCore()
  const html = sanitizeContentHtml('<div class="summary-card"><span>全篇摘要</span><div>这段文字会由摘要卡展示。</div></div><p>这里才是正文。</p>')

  assert.equal(html, '<p>这里才是正文。</p>')
})

test('normalizeCategories 仅返回可用于筛选的类目', () => {
  const { normalizeCategories } = loadCore()
  assert.equal(typeof normalizeCategories, 'function')

  const categories = normalizeCategories([
    { id: 7, name: '旅行' },
    { id: 343, name: '昨年今日' },
    { id: 398, name: '就是瞎拍' },
    { id: 'invalid', name: '不应显示' },
    { id: 9, name: '<em>摄影</em>' },
    { id: 11, name: '' }
  ])

  assert.deepEqual(categories, [{ id: 7, name: '旅行' }, { id: 9, name: '摄影' }])
})

test('isHiddenPost 阻止隐藏类目的文章被详情接口直接访问', () => {
  const { isHiddenPost } = loadCore()
  assert.equal(typeof isHiddenPost, 'function')

  assert.equal(isHiddenPost({ categories: [7, 343] }), true)
  assert.equal(isHiddenPost({ categories: [7, 9] }), false)
})
