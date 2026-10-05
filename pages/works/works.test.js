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
  const rule = style.match(/\.delete-button\s*\{([^}]+)\}/)?.[1] || ''
  const width = Number(rule.match(/width:\s*(\d+)rpx/)?.[1])
  const height = Number(rule.match(/height:\s*(\d+)rpx/)?.[1])
  const fontSize = Number(rule.match(/font-size:\s*(\d+)rpx/)?.[1])
  assert.match(rule, /position:\s*absolute/)
  assert.match(rule, /background:\s*transparent/)
  assert.ok(width >= 72 && height >= 72, '删除文字周围应有足够大的触摸区域')
  assert.ok(fontSize <= 22, '删除文字本身保持轻量')
})
