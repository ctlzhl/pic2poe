const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function readPageFile(fileName) {
  return fs.readFileSync(path.join(__dirname, fileName), 'utf8')
}

test('首页主按钮用 flex 明确水平与垂直居中', () => {
  const source = readPageFile('home/home.wxss')

  assert.match(source, /\.hero-button\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?padding:\s*0;[\s\S]*?line-height:\s*1;/)
})

test('首页将创作说明呈现为一行三步向导', () => {
  const source = readPageFile('home/home.wxml')

  assert.match(source, /class="creation-guide"/)
  assert.match(source, />上传照片<\/view>/)
  assert.match(source, />选择创作<\/view>/)
  assert.match(source, />收获文字<\/view>/)
  assert.equal((source.match(/class="guide-arrow"/g) || []).length, 2)
})

test('我的页头像与昵称资料区可触发微信资料授权', () => {
  const source = readPageFile('my/my.wxml')

  const authorizationEntrances = source.match(/class="profile-tap"\s+bindtap="authorizeProfile"/g) || []

  assert.equal(authorizationEntrances.length, 2)
  assert.match(source, /class="profile-name">点击授权登录<\/view>/)
})
