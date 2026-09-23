const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('当前编译链路启用组件按需注入', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'))

  assert.equal(appConfig.lazyCodeLoading, 'requiredComponents')
})

test('代码包忽略公众号素材与本地辅助文件', () => {
  const projectConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'project.config.json'), 'utf8'))
  const ignoredPaths = projectConfig.packOptions.ignore.map((item) => item.value)

  assert.deepEqual(ignoredPaths, [
    '.agents',
    'docs',
    'assets/images/zhihu-photo-words-wechat-cover-900x383.png',
    'assets/images/zhihu-photo-words-wechat-cover-v1.png',
    'skills-lock.json'
  ])
})

test('编译与上传不应过滤 Babel 的运行时依赖', () => {
  const projectConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'project.config.json'), 'utf8'))

  assert.equal(projectConfig.setting.ignoreDevUnusedFiles, false)
  assert.equal(projectConfig.setting.ignoreUploadUnusedFiles, false)
})

test('按需注入的底部导航在首次渲染时使用原生占位组件', () => {
  for (const pageName of ['creating', 'result']) {
    const pageConfig = JSON.parse(fs.readFileSync(path.join(__dirname, `pages/${pageName}/${pageName}.json`), 'utf8'))
    assert.deepEqual(pageConfig.componentPlaceholder, { 'bottom-nav': 'view' })
  }
})

test('首页背景图符合代码包资源体积建议', () => {
  const heroImage = path.join(__dirname, 'assets/images/home-hero-v1.jpg')

  assert.ok(fs.statSync(heroImage).size <= 200 * 1024)
})
