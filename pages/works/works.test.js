const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const readPageFile = (name) => fs.readFileSync(path.join(__dirname, name), 'utf8')

test('我的作品每页展示十条并提供翻页操作', () => {
  const script = readPageFile('works.js')
  const template = readPageFile('works.wxml')

  assert.match(script, /loadWorks\(page = 1\)/)
  assert.match(script, /previousPage\(\)/)
  assert.match(script, /nextPage\(\)/)
  assert.match(template, /bindtap="previousPage"/)
  assert.match(template, /bindtap="nextPage"/)
  assert.match(template, /第\s*\{\{page\}\}\s*\/\s*\{\{totalPages\}\}\s*页/)
})

test('删除操作不占用作品正文的横向空间', () => {
  const style = readPageFile('works.wxss')
  const template = readPageFile('works.wxml')

  assert.match(style, /\.work-card\s*\{[\s\S]*?position:\s*relative;/)
  assert.match(template, /<view class="delete-button"[^>]*role="button"/)
  assert.doesNotMatch(template, /<button class="delete-button"/)
  assert.match(style, /\.delete-button\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?width:\s*48rpx;[\s\S]*?height:\s*44rpx;[\s\S]*?background:\s*transparent;/)
})
