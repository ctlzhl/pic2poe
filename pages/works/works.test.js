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

test('从作品详情返回时继续显示离开前的页码', () => {
  const previousPage = global.Page
  const previousWx = global.wx
  let definition
  global.Page = (options) => { definition = options }
  global.wx = { getStorageSync() { return true } }
  try {
    delete require.cache[require.resolve('./works.js')]
    require('./works.js')
    const requested = []
    const page = { data: { ...definition.data, page: 3 }, loadWorks(value) { requested.push(value) } }
    definition.onShow.call(page)
    assert.deepEqual(requested, [3])
  } finally {
    if (previousPage === undefined) delete global.Page
    else global.Page = previousPage
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('未登录时不能直接打开我的作品列表', () => {
  const previousPage = global.Page
  const previousWx = global.wx
  let definition
  let destination
  global.Page = (options) => { definition = options }
  global.wx = {
    getStorageSync() { return false },
    switchTab({ url }) { destination = url },
    cloud: { callFunction() { assert.fail('未登录不应读取作品') } }
  }
  try {
    delete require.cache[require.resolve('./works.js')]
    require('./works.js')
    const page = { data: { ...definition.data }, loadWorks() { assert.fail('未登录不应加载作品') } }
    definition.onShow.call(page)
    assert.equal(destination, '/pages/my/my')
  } finally {
    if (previousPage === undefined) delete global.Page
    else global.Page = previousPage
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
