const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function readPageFile(fileName) {
  return fs.readFileSync(path.join(__dirname, fileName), 'utf8')
}

test('首页主按钮用 flex 明确水平与垂直居中', () => {
  const source = readPageFile('../app.wxss')
  const template = readPageFile('home/home.wxml')

  assert.match(template, /class="ui-button ui-button-light hero-button"/)
  assert.match(source, /\.ui-button\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/)
})

test('首页将创作说明呈现为一行三步向导', () => {
  const source = readPageFile('home/home.wxml')

  assert.match(source, /class="creation-guide"/)
  assert.match(source, />选图<\/view>/)
  assert.match(source, />选类型<\/view>/)
  assert.match(source, />创作<\/view>/)
  assert.equal((source.match(/class="guide-arrow"/g) || []).length, 2)
})

test('我的页通过微信标准头像与昵称控件编辑资料', () => {
  const source = readPageFile('my/my.wxml')
  const script = readPageFile('my/my.js')
  const style = readPageFile('my/my.wxss')

  assert.match(source, /open-type="chooseAvatar"/)
  assert.match(source, /type="nickname"/)
  assert.match(source, /bindchooseavatar="onChooseAvatar"/)
  assert.match(source, /focus="\{\{nicknameFocused\}\}"/)
  assert.match(source, /bindtap="focusNickname"/)
  assert.match(script, /focusNickname\(\)/)
  assert.match(script, /saveProfile\(\{ avatarFileId: uploadResult\.fileID \}\)/)
  assert.doesNotMatch(script, /\|\| '微信用户'/)
  assert.match(style, /\.avatar-button\s*\{[\s\S]*?width:\s*92rpx;[\s\S]*?min-width:\s*0;/)
  assert.match(style, /\.profile-info\s*\{[\s\S]*?margin-left:\s*8rpx;/)
  assert.doesNotMatch(script, /wx\.getUserProfile/)
})
