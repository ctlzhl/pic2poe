const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'my.js')
const flushAsync = () => new Promise(setImmediate)

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
    getStorageSync() { return true },
    cloud: { callFunction({ name, data, success }) {
      if (name === 'listWorks') success({ result: { ok: true, data: { works: [], total: 0 } } })
      else calls.push({ data, success })
    } },
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

test('回访已确认资料时保留页面内容，只刷新作品列表', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const calls = []
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, data, success }) {
      calls.push({ name, data })
      if (name === 'userProfile') {
        success({ result: { ok: true, data: { authorized: true, profile: { nickName: '摄影者', avatarUrl: 'https://avatar.example/p.jpg' } } } })
      } else {
        success({ result: { ok: true, data: { works: [], total: 0 } } })
      }
    } },
    showToast() {}
  }

  try {
    const page = createPage(definition)
    page.onShow()
    await flushAsync()
    assert.equal(page.data.profileLoading, false)
    assert.equal(page.data.profile.nickName, '摄影者')
    assert.deepEqual(calls.map(({ name }) => name), ['userProfile', 'listWorks'])

    page.onShow()
    assert.equal(page.data.profileLoading, false)
    assert.equal(page.data.profile.nickName, '摄影者')
    await flushAsync()
    assert.deepEqual(calls.map(({ name }) => name), ['userProfile', 'listWorks', 'listWorks'])
  } finally {
    await flushAsync()
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('已登录但未填写头像昵称的用户仍能在我的页面看到已有作品', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const calls = []
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, success }) {
      calls.push(name)
      if (name === 'userProfile') success({ result: { ok: true, data: { authorized: false, profile: null } } })
      else success({ result: { ok: true, data: { works: [{ workId: 'work-1', type: 'poem', title: '春日' }], total: 1 } } })
    } },
    showToast() {}
  }
  try {
    const page = createPage(definition)
    await page.onShow()
    assert.deepEqual(calls, ['userProfile', 'listWorks'])
    assert.equal(page.data.authorized, false)
    assert.equal(page.data.works[0].workId, 'work-1')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('未登录时不读取作品，微信登录后即使未填写资料也可以查看', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let signedIn = false
  const calls = []
  global.wx = {
    getStorageSync() { return signedIn },
    setStorageSync(key, value) { assert.equal(key, 'profileSignedIn:v1'); signedIn = value },
    login({ success }) { calls.push('wx.login'); success({ code: 'test-code' }) },
    cloud: { callFunction({ name, success }) {
      calls.push(name)
      if (name === 'userProfile') success({ result: { ok: true, data: { authorized: false, profile: null } } })
      else success({ result: { ok: true, data: { works: [{ workId: 'work-1' }], total: 1 } } })
    } },
    showToast() {}
  }
  try {
    const page = createPage(definition, { profile: { nickName: '旧资料' }, works: [{ workId: 'old' }] })
    await page.onShow()
    assert.equal(page.data.signedOut, true)
    assert.deepEqual(page.data.profile, {})
    assert.deepEqual(page.data.works, [])
    assert.deepEqual(calls, [])
    await page.loginProfile()
    assert.equal(signedIn, true)
    assert.equal(page.data.signedOut, false)
    assert.equal(page.data.authorized, false)
    assert.deepEqual(calls, ['wx.login', 'userProfile', 'listWorks'])
    assert.equal(page.data.works[0].workId, 'work-1')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('身份确认失败时不开放作品列表', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleError = console.error
  const calls = []
  console.error = () => {}
  global.wx = {
    getStorageSync() { return false },
    setStorageSync() { assert.fail('身份未确认时不应记录登录状态') },
    login({ success }) { success({ code: 'test-code' }) },
    cloud: { callFunction({ name, success }) {
      calls.push(name)
      success({ result: { ok: false, message: '身份确认失败' } })
    } },
    showToast() {}
  }
  try {
    const page = createPage(definition)
    await page.onShow()
    await page.loginProfile()
    assert.deepEqual(calls, ['userProfile'])
    assert.equal(page.data.signedOut, true)
    assert.deepEqual(page.data.works, [])
  } finally {
    console.error = previousConsoleError
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('微信登录失败时不调用云函数', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  global.wx = {
    getStorageSync() { return false },
    login({ fail }) { fail(new Error('login failed')) },
    cloud: { callFunction() { assert.fail('登录失败时不应读取作品') } },
    showToast() {}
  }
  try {
    const page = createPage(definition)
    await page.onShow()
    await page.loginProfile()
    assert.equal(page.data.signedOut, true)
    assert.equal(page.data.loggingIn, false)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('保存资料后的回访使用保存结果，不再读取旧资料', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const calls = []
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, data, success }) {
      calls.push({ name, data })
      if (name === 'userProfile' && data.action === 'get') {
        success({ result: { ok: true, data: { authorized: false, profile: null } } })
      } else if (name === 'userProfile') {
        success({ result: { ok: true, data: { authorized: true, profile: { nickName: '新昵称', avatarUrl: 'https://avatar.example/new.jpg' } } } })
      } else {
        success({ result: { ok: true, data: { works: [], total: 0 } } })
      }
    } },
    showToast() {}
  }

  try {
    const page = createPage(definition)
    page.onShow()
    await flushAsync()
    await page.saveProfile({ nickName: '新昵称' })
    page.onShow()
    assert.equal(page.data.profileLoading, false)
    assert.equal(page.data.profile.nickName, '新昵称')
    assert.equal(page.data.profile.avatarUrl, 'https://avatar.example/new.jpg')
    await flushAsync()
    assert.deepEqual(calls.map(({ name, data }) => `${name}:${data.action || ''}`), [
      'userProfile:get', 'listWorks:', 'userProfile:save', 'listWorks:', 'listWorks:'
    ])
  } finally {
    await flushAsync()
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('首次资料请求未结束时再次显示页面不会重复请求', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const calls = []
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, success }) {
      if (name === 'userProfile') calls.push({ name, success })
      else success({ result: { ok: true, data: { works: [], total: 0 } } })
    } },
    showToast() {}
  }

  try {
    const page = createPage(definition)
    page.onShow()
    page.onShow()
    assert.equal(calls.length, 1)
  } finally {
    calls.forEach(({ success }) => success({ result: { ok: true, data: { authorized: true, profile: { nickName: '摄影者', avatarUrl: 'https://avatar.example/p.jpg' } } } }))
    await flushAsync()
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('首次资料读取失败后可重试，成功确认的访客状态在回访时复用', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleError = console.error
  const calls = []
  console.error = () => {}
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, data, success }) {
      calls.push({ name, data })
      if (calls.length === 1) success({ result: { ok: false, message: '暂时无法读取' } })
      else success({ result: { ok: true, data: { authorized: false, profile: null } } })
    } },
    showToast() {}
  }

  try {
    const page = createPage(definition)
    page.onShow()
    await flushAsync()
    assert.equal(page.data.profileLoading, false)
    page.onShow()
    await flushAsync()
    assert.equal(page.data.profileLoading, false)
    assert.equal(page.data.authorized, false)
    page.onShow()
    assert.equal(page.data.profileLoading, false)
    assert.deepEqual(calls.map(({ name, data }) => `${name}:${data.action}`), [
      'userProfile:get', 'listWorks:undefined', 'userProfile:get', 'listWorks:undefined', 'listWorks:undefined'
    ])
  } finally {
    await flushAsync()
    console.error = previousConsoleError
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('长时间未刷新资料后回访会后台更新头像且不遮住页面', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousNow = Date.now
  const calls = []
  let now = 1000000
  Date.now = () => now
  global.wx = {
    getStorageSync() { return true },
    cloud: { callFunction({ name, data, success }) {
      calls.push({ name, data })
      if (name === 'userProfile') {
        const avatarUrl = calls.filter(({ name: calledName }) => calledName === 'userProfile').length === 1
          ? 'https://avatar.example/old.jpg' : 'https://avatar.example/new.jpg'
        success({ result: { ok: true, data: { authorized: true, profile: { nickName: '摄影者', avatarUrl } } } })
      } else {
        success({ result: { ok: true, data: { works: [], total: 0 } } })
      }
    } },
    showToast() {}
  }

  try {
    const page = createPage(definition)
    page.onShow()
    await flushAsync()
    now += 31 * 60 * 1000
    page.onShow()
    assert.equal(page.data.profileLoading, false)
    assert.equal(page.data.profile.avatarUrl, 'https://avatar.example/old.jpg')
    await flushAsync()
    assert.equal(page.data.profile.avatarUrl, 'https://avatar.example/new.jpg')
    assert.equal(calls.filter(({ name }) => name === 'userProfile').length, 2)
  } finally {
    await flushAsync()
    Date.now = previousNow
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
