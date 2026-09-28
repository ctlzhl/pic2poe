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
    assert.equal(page.data.showCreationForm, true)
    assert.equal(page.data.prepareState, 'error')
    assert.equal(page.data.assetId, '')
  } finally {
    console.error = previousConsoleError
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('大图并行上传原图和工作图，云端处理收到各自文件 ID', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const uploads = []
  let prepareData
  let ticketData
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/original.jpg', size: 4886339 }] }),
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { success({ tempFilePath: '/tmp/working.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) },
    cloud: {
      callFunction({ name, data, success }) {
        if (name === 'createImageUpload') {
          ticketData = data
          return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/original.jpg', workingStagingPath: 'staging/working.jpg' } } })
        }
        prepareData = data
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ cloudPath, filePath, success }) {
        uploads.push({ cloudPath, filePath })
        success({ fileID: `cloud://${cloudPath}` })
      }
    }
  }
  try {
    const page = createPage(definition, {})
    await page.chooseImage()
    assert.deepEqual(uploads, [
      { cloudPath: 'staging/original.jpg', filePath: '/tmp/original.jpg' },
      { cloudPath: 'staging/working.jpg', filePath: '/tmp/working.jpg' }
    ])
    assert.equal(ticketData.workingExtension, 'jpg')
    assert.deepEqual(prepareData, {
      assetId: 'asset',
      fileID: 'cloud://staging/original.jpg',
      workingFileID: 'cloud://staging/working.jpg'
    })
    assert.equal(page.data.prepareState, 'ready')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('创建上传任务与本地压缩同时进行，避免两段耗时相加', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let finishCompression
  let ticketStarted = false
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/original.jpg', size: 4886339 }] }),
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { finishCompression = () => success({ tempFilePath: '/tmp/working.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) },
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') {
          ticketStarted = true
          return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/original.jpg', workingStagingPath: 'staging/working.jpg' } } })
        }
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ cloudPath, success }) { success({ fileID: `cloud://${cloudPath}` }) }
    }
  }
  try {
    const page = createPage(definition, {})
    const pending = page.chooseImage()
    while (!finishCompression) await Promise.resolve()
    assert.equal(ticketStarted, true)
    finishCompression()
    await pending
    assert.equal(page.data.prepareState, 'ready')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('jpeg 后缀的原图仍为 jpg 工作图申请暂存路径', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let requestedExtension
  let prepareData
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/original.jpeg', size: 4886339 }] }),
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpeg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { success({ tempFilePath: '/tmp/working.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) },
    cloud: {
      callFunction({ name, data, success }) {
        if (name === 'createImageUpload') {
          requestedExtension = data.workingExtension
          return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/original.jpeg', workingStagingPath: 'staging/working.jpg' } } })
        }
        prepareData = data
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ cloudPath, success }) { success({ fileID: `cloud://${cloudPath}` }) }
    }
  }
  try {
    await createPage(definition, {}).chooseImage()
    assert.equal(requestedExtension, 'jpg')
    assert.equal(prepareData.workingFileID, 'cloud://staging/working.jpg')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('工作图上传失败时仅用已成功上传的原图继续创作', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleError = console.error
  const deleted = []
  let prepareData
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/original.jpg', size: 4886339 }] }),
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { success({ tempFilePath: '/tmp/working.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) },
    cloud: {
      callFunction({ name, data, success }) {
        if (name === 'createImageUpload') return success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/original.jpg', workingStagingPath: 'staging/working.jpg' } } })
        prepareData = data
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ cloudPath, success, fail }) {
        if (cloudPath.includes('working')) fail(new Error('upload failed'))
        else success({ fileID: 'cloud://staging/original.jpg' })
      },
      deleteFile: async ({ fileList }) => { deleted.push(...fileList) }
    },
    showToast() {}
  }
  try {
    console.error = () => {}
    const page = createPage(definition, {})
    await page.chooseImage()
    assert.deepEqual(deleted, [])
    assert.deepEqual(prepareData, { assetId: 'asset', fileID: 'cloud://staging/original.jpg' })
    assert.equal(page.data.prepareState, 'ready')
  } finally {
    console.error = previousConsoleError
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('原图上传失败时回收已经上传的工作图', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleError = console.error
  const deleted = []
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/original.jpg', size: 4886339 }] }),
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { success({ tempFilePath: '/tmp/working.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) },
    cloud: {
      callFunction({ success }) { success({ result: { ok: true, data: { assetId: 'asset', stagingPath: 'staging/original.jpg', workingStagingPath: 'staging/working.jpg' } } }) },
      uploadFile({ cloudPath, success, fail }) {
        if (cloudPath.includes('original')) fail(new Error('upload failed'))
        else success({ fileID: 'cloud://staging/working.jpg' })
      },
      deleteFile: async ({ fileList }) => { deleted.push(...fileList) }
    },
    showToast() {}
  }
  try {
    console.error = () => {}
    const page = createPage(definition, {})
    await page.chooseImage()
    assert.deepEqual(deleted, ['cloud://staging/working.jpg'])
    assert.equal(page.data.prepareState, 'error')
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

test('选中图片后立即开放创作表单，但处理完成前不能开始创作', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let finishUpload
  let choosing
  let creationCalls = 0
  let loadingCalls = 0
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] }),
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') return success({ result: { ok: true, data: { assetId: 'asset-1', stagingPath: 'staging/u/photo.jpg' } } })
        if (name === 'createCreation') creationCalls++
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ success }) { finishUpload = () => success({ fileID: 'cloud://staging.jpg' }) }
    },
    showLoading() { loadingCalls++ }, hideLoading() {}, showToast() {}
  }
  try {
    const page = createPage(definition, {})
    choosing = page.chooseImage()
    while (!finishUpload) await Promise.resolve()

    assert.equal(page.data.imageUrl, '/tmp/photo.jpg')
    assert.equal(page.data.showCreationForm, true)
    assert.equal(page.data.preparing, true)
    assert.equal(loadingCalls, 0)
    page.updateMoment({ detail: { value: '傍晚散步' } })
    await page.startCreation()
    assert.equal(page.data.moment, '傍晚散步')
    assert.equal(creationCalls, 0)

    finishUpload()
    finishUpload = null
    await choosing
    assert.equal(page.data.assetId, 'asset-1')
    assert.equal(page.data.showCreationForm, true)
  } finally {
    if (finishUpload) finishUpload()
    if (choosing) await choosing
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('图片准备过程输出选图、上传和云端处理的分段耗时', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  const previousConsoleInfo = console.info
  const timingLogs = []
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] }),
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') return success({ result: { ok: true, data: { assetId: 'asset-1', stagingPath: 'staging/u/photo.jpg' } } })
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ success }) { success({ fileID: 'cloud://staging.jpg' }) }
    },
    showLoading() {}, hideLoading() {}
  }
  try {
    console.info = (label, timing) => { if (label === '[imageUploadTiming]') timingLogs.push(timing) }
    await createPage(definition, {}).chooseImage()
    assert.equal(timingLogs.length, 1)
    assert.equal(timingLogs[0].outcome, 'ready')
    assert.equal(timingLogs[0].inputBytes, 100)
    for (const stage of ['privacyMs', 'selectionMs', 'formatMs', 'createUploadMs', 'uploadMs', 'prepareMs', 'totalMs']) {
      assert.equal(typeof timingLogs[0][stage], 'number')
      assert.ok(timingLogs[0][stage] >= 0)
    }
  } finally {
    console.info = previousConsoleInfo
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('系统相册临时隐藏页面后仍继续准备所选图片', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let finishSelection
  const functionCalls = []
  global.wx = {
    chooseMedia: () => new Promise((resolve) => { finishSelection = resolve }),
    cloud: {
      callFunction({ name, success }) {
        functionCalls.push(name)
        if (name === 'createImageUpload') {
          success({ result: { ok: true, data: { assetId: 'asset-1', stagingPath: 'staging/u/photo.jpg' } } })
          return
        }
        success({ result: { ok: true, data: {} } })
      },
      uploadFile({ success }) { success({ fileID: 'cloud://staging.jpg' }) }
    },
    showLoading() {}, hideLoading() {}, showToast() {}, showModal() {}
  }

  try {
    const page = createPage(definition, {})
    const choosing = page.chooseImage()
    while (!finishSelection) await Promise.resolve()
    page.onHide()
    finishSelection({ tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] })
    await choosing

    assert.deepEqual(functionCalls, ['createImageUpload', 'prepareImage'])
    assert.equal(page.data.assetId, 'asset-1')
    assert.equal(page.data.prepareState, 'ready')
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('离开创作页后清空未提交的图片与创作草稿', () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  global.wx = { hideLoading() {} }
  const page = createPage(definition, {
    imageUrl: '/tmp/photo.jpg',
    showCreationForm: true,
    assetId: 'asset-1',
    idempotencyKey: 'create-1',
    prepareState: 'ready',
    prepareMessage: '图片已准备好',
    preparing: false,
    generateType: 'review',
    mood: 'warm',
    location: '西湖',
    moment: '散步'
  })

  try {
    page.onHide()

    assert.deepEqual({
      imageUrl: page.data.imageUrl,
      showCreationForm: page.data.showCreationForm,
      assetId: page.data.assetId,
      idempotencyKey: page.data.idempotencyKey,
      prepareState: page.data.prepareState,
      prepareMessage: page.data.prepareMessage,
      generateType: page.data.generateType,
      mood: page.data.mood,
      location: page.data.location,
      moment: page.data.moment
    }, {
      imageUrl: '',
      showCreationForm: false,
      assetId: '',
      idempotencyKey: '',
      prepareState: 'idle',
      prepareMessage: '',
      generateType: 'poem',
      mood: 'auto',
      location: '',
      moment: ''
    })
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('离开创作页后，仍在上传的旧图片不能回写到新首屏', async () => {
  const definition = loadPageDefinition()
  const previousWx = global.wx
  let finishUpload
  const deleted = []
  global.wx = {
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/photo.jpg', size: 100 }] }),
    cloud: {
      callFunction({ name, success }) {
        if (name === 'createImageUpload') {
          success({ result: { ok: true, data: { assetId: 'asset-1', stagingPath: 'staging/u/photo.jpg' } } })
          return
        }
        throw new Error('离开页面后不应继续处理图片')
      },
      uploadFile({ success }) { finishUpload = () => success({ fileID: 'cloud://staging.jpg' }) },
      deleteFile: async ({ fileList }) => { deleted.push(...fileList) }
    },
    showLoading() {}, hideLoading() {}, showToast() {}, showModal() {}
  }

  try {
    const page = createPage(definition, {})
    const choosing = page.chooseImage()
    while (!finishUpload) await Promise.resolve()
    page.onHide()
    finishUpload()
    await choosing

    assert.equal(page.data.imageUrl, '')
    assert.equal(page.data.assetId, '')
    assert.equal(page.data.prepareState, 'idle')
    assert.deepEqual(deleted, ['cloud://staging.jpg'])
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})
