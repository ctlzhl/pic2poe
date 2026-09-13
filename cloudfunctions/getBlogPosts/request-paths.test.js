const assert = require('node:assert/strict')
const test = require('node:test')

const { buildListPath } = require('./index')

test('buildListPath 为选中的类目附加 WordPress 分类筛选参数', () => {
  assert.equal(typeof buildListPath, 'function')
  assert.equal(
    buildListPath({ page: 2, pageSize: 10, categoryId: 7 }),
    '/posts?_embed=1&per_page=10&page=2&orderby=date&order=desc&categories_exclude=343,398&categories=7'
  )
})

test('buildListPath 未选择类目时请求全部文章', () => {
  assert.equal(
    buildListPath({ page: 1, pageSize: 3 }),
    '/posts?_embed=1&per_page=3&page=1&orderby=date&order=desc&categories_exclude=343,398'
  )
})
