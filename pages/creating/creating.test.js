const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'creating.js')

function loadPageDefinition() {
  const originalPage = global.Page
  let definition
  global.Page = (options) => {
    definition = options
  }
  delete require.cache[require.resolve(PAGE_PATH)]
  require(PAGE_PATH)
  if (originalPage === undefined) delete global.Page
  else global.Page = originalPage
  return definition
}

function createPage(definition, data = {}) {
  const page = {
    data: { ...definition.data, ...data },
    setData(update, callback) {
      Object.assign(this.data, update)
      if (callback) callback()
    }
  }

  Object.entries(definition).forEach(([name, value]) => {
    if (typeof value === 'function') page[name] = value.bind(page)
  })
  return page
}

test('创作成功后在三秒内自动进入结果页', () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    taskId: 'task-1',
    workId: 'work-1',
    status: 'succeeded'
  })
  let redirectCount = 0
  page.goResult = () => {
    redirectCount += 1
  }

  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const scheduled = []
  global.setTimeout = (callback) => {
    scheduled.push(callback)
    return scheduled.length
  }
  global.clearTimeout = () => {}

  try {
    page.startSuccessCountdown()
    assert.equal(page.data.countdown, 3)

    scheduled.shift()()
    assert.equal(page.data.countdown, 2)

    scheduled.shift()()
    assert.equal(page.data.countdown, 1)

    scheduled.shift()()
    assert.equal(redirectCount, 1)
  } finally {
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  }
})

test('成功页隐藏期间不跳转，重新显示后再倒计时', () => {
  const page = createPage(loadPageDefinition(), {
    taskId: 'task-1', workId: 'work-1', status: 'succeeded'
  })
  let redirects = 0
  page.goResult = () => { redirects += 1 }
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const scheduled = new Map()
  let nextId = 0
  global.setTimeout = (callback) => {
    const id = ++nextId
    scheduled.set(id, callback)
    return id
  }
  global.clearTimeout = (id) => scheduled.delete(id)
  const tick = () => {
    const [id, callback] = scheduled.entries().next().value
    scheduled.delete(id)
    callback()
  }

  try {
    page.startSuccessCountdown()
    page.onHide()
    assert.equal(scheduled.size, 0)
    assert.equal(redirects, 0)
    page.onShow()
    tick()
    tick()
    tick()
    assert.equal(redirects, 1)
  } finally {
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  }
})

test('页面隐藏后不接收之前发出的轮询结果', async () => {
  const helper = require('../../utils/requestHelper')
  const originalCall = helper.callFunctionWithTimeout
  let completeRequest
  helper.callFunctionWithTimeout = () => new Promise((resolve) => { completeRequest = resolve })
  let definition
  try {
    definition = loadPageDefinition()
  } finally {
    helper.callFunctionWithTimeout = originalCall
  }
  const page = createPage(definition, { taskId: 'task-1' })
  const pending = page.pollTask()
  page.onHide()
  completeRequest({ result: { ok: true, data: { status: 'succeeded', workId: 'work-1' } } })
  await pending
  assert.equal(page.data.status, 'queued')
  assert.equal(page.data.workId, '')
})

test('创作中页面恢复照片与类型，并随任务状态显示进度', async () => {
  const helper = require('../../utils/requestHelper')
  const originalCall = helper.callFunctionWithTimeout
  helper.callFunctionWithTimeout = async () => ({ result: { ok: true, data: { status: 'generating', workId: '' } } })
  let definition
  try { definition = loadPageDefinition() } finally { helper.callFunctionWithTimeout = originalCall }
  const page = createPage(definition, { taskId: 'task-1' })
  page.pageVisible = true
  try {
    page.onLoad({ taskId: 'task-1', type: 'review', preview: 'wxfile%3A%2F%2Fphoto.jpg' })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(page.data.previewUrl, 'wxfile://photo.jpg')
    assert.equal(page.data.typeTitle, '图片点评')
    assert.equal(page.data.progressPercent, 70)
    assert.equal(page.data.statusText, '正在写下这一刻')
    page.setData({ showSlowMessage: true })
    await page.pollTask()
    assert.equal(page.data.showSlowMessage, true)
  } finally {
    page.stopPolling()
  }
})
