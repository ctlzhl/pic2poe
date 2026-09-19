const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'my.js')

const loadPageDefinition = () => {
  const previous = global.Page
  let definition
  global.Page = (options) => { definition = options }
  delete require.cache[require.resolve(PAGE_PATH)]
  require(PAGE_PATH)
  if (previous === undefined) delete global.Page
  else global.Page = previous
  return definition
}

const createPage = (definition, data = {}) => {
  const page = {
    data: { ...definition.data, ...data },
    setData(update) {
      Object.entries(update).forEach(([key, value]) => {
        if (key.startsWith('profile.')) this.data.profile = { ...this.data.profile, [key.slice('profile.'.length)]: value }
        else this.data[key] = value
      })
    }
  }
  Object.entries(definition).forEach(([name, value]) => {
    if (typeof value === 'function') page[name] = value.bind(page)
  })
  return page
}

test('头像保存期间填写昵称会在头像保存后继续提交', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const calls = []
  global.wx = {
    cloud: { callFunction({ data, success }) { calls.push({ data, success }) } },
    showToast() {}
  }

  try {
    const page = createPage(definition, { profile: { nickName: '旧昵称' } })
    const savingAvatar = page.saveProfile({ avatarFileId: 'cloud://avatar.jpg' })
    await Promise.resolve()
    const savingName = page.saveProfile({ nickName: '新昵称' })
    calls.shift().success({ result: { ok: true, data: { authorized: false, profile: { nickName: '旧昵称', avatarUrl: 'https://avatar' } } } })
    await Promise.resolve()
    assert.deepEqual(calls[0].data.profile, { nickName: '新昵称' })
    calls.shift().success({ result: { ok: true, data: { authorized: false, profile: { nickName: '新昵称', avatarUrl: 'https://avatar' } } } })
    await Promise.all([savingAvatar, savingName])
    assert.equal(page.data.profile.nickName, '新昵称')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
