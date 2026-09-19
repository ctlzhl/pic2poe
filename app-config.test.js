const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('当前编译链路不启用组件按需注入', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'))

  assert.equal(appConfig.lazyCodeLoading, undefined)
})

test('首页背景图符合代码包资源体积建议', () => {
  const heroImage = path.join(__dirname, 'assets/images/home-hero-v1.jpg')

  assert.ok(fs.statSync(heroImage).size <= 200 * 1024)
})
