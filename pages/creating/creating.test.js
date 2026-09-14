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
