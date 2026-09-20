const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'index.js')

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

const createPage = (definition, data) => {
  const page = { data: { ...definition.data, ...data }, setData(update) { Object.assign(this.data, update) } }
  Object.entries(definition).forEach(([name, value]) => { if (typeof value === 'function') page[name] = value.bind(page) })
  return page
}

test('一次创作受理后再次创作使用新的幂等键', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const requests = []
  global.wx = {
    cloud: { callFunction({ data, success }) { requests.push(data); success({ result: { ok: true, data: { taskId: `task-${requests.length}` } } }) } },
    showLoading() {}, hideLoading() {}, navigateTo() {}, showToast() {}
  }
  try {
    const page = createPage(definition, { assetId: 'asset', idempotencyKey: 'first-key', prepareState: 'ready' })
    await page.startCreation()
    page.setData({ generateType: 'review' })
    await page.startCreation()
    assert.equal(requests.length, 2)
    assert.equal(requests[0].idempotencyKey, 'first-key')
    assert.notEqual(requests[1].idempotencyKey, 'first-key')
    assert.equal(requests[1].generateType, 'review')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('图片处理失败时回收已经上传的暂存文件', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleError = console.error
  const deleted = []
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] }),
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/u/photo.jpg' } } })
        success({ result: { ok: false, message: '图片处理失败' } })
      },
      uploadFile({ success }) { success({ fileID: 'cloud://staging.jpg' }) },
      deleteFile: async ({ fileList }) => { deleted.push(...fileList) }
    },
    showLoading() {}, hideLoading() {}, showToast() {}, showModal() {}
  }
  try {
    console.error = () => {}
    const page = createPage(definition, {})
    await page.chooseImage()
    assert.deepEqual(deleted, ['cloud://staging.jpg'])
  } finally {
    console.error = previousConsoleError
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('选择图片时只允许一张并默认使用压缩图', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let chooseOptions
  global.wx = {
    requirePrivacyAuthorize({ success }) { success() },
    chooseMedia: async (options) => {
      chooseOptions = options
      return { tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] }
    },
    getImageInfo({ success }) { success({ type: 'jpeg' }) },
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/u/photo.jpg' } } })
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ success }) { success({ fileID: 'cloud://staging.jpg' }) }
    },
    showLoading() {}, hideLoading() {}, showToast() {}, showModal() {}
  }
  try {
    const page = createPage(definition, {})
    await page.chooseImage()
    assert.equal(chooseOptions.count, 1)
    assert.deepEqual(chooseOptions.sizeType, ['compressed', 'original'])
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
