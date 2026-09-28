const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

const ORIGINAL = Buffer.from([0xff, 0xd8, 0xff, 1, 1, 1, 1, 1, 1, 1, 1, 1])
const WORKING = Buffer.from([0xff, 0xd8, 0xff, 2, 2, 2, 2, 2, 2, 2, 2, 2])

const loadHandler = (asset, controls) => {
  const updates = []
  const deleted = []
  const downloads = []
  const checkedImages = []
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'env',
    init() {},
    getWXContext: () => ({ OPENID: 'u' }),
    database: () => ({
      serverDate: () => new Date(),
      runTransaction: async (callback) => callback({
        collection: () => ({ doc: () => ({
          get: async () => ({ data: asset }),
          update: async ({ data }) => { updates.push(data) }
        }) })
      }),
      collection: () => ({ doc: () => ({ update: async ({ data }) => { updates.push(data) } }) })
    }),
    downloadFile: async ({ fileID }) => {
      downloads.push(fileID)
      if (fileID.endsWith('/original.jpg')) {
        await controls.originalReady
        return { fileContent: ORIGINAL }
      }
      return { fileContent: WORKING }
    },
    uploadFile: async ({ cloudPath }) => ({ fileID: `cloud://env/${cloudPath}` }),
    deleteFile: async ({ fileList }) => { deleted.push(...fileList) },
    openapi: { security: { imgSecCheck: async ({ media }) => {
      checkedImages.push(media.value)
      return media.value === ORIGINAL && controls.rejectOriginal ? { errCode: 87014 } : { errCode: 0 }
    } } }
  }
  const sharp = (input) => {
    const pipeline = {
      metadata: async () => input === ORIGINAL
        ? (controls.originalMetadata || { format: 'jpeg', width: 5712, height: 4284, orientation: 6 })
        : { format: 'jpeg', width: 1536, height: 2048, orientation: 1 },
      rotate: () => pipeline,
      toColorspace: () => pipeline,
      flatten: () => pipeline,
      clone: () => pipeline,
      resize: () => pipeline,
      jpeg: () => pipeline,
      toBuffer: async () => {
        controls.onDerive?.()
        return input === ORIGINAL ? ORIGINAL : WORKING
      }
    }
    return pipeline
  }
  const originalLoad = Module._load
  const handlerPath = path.join(__dirname, 'index.js')
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloud
    if (request === 'sharp') return sharp
    return originalLoad.call(this, request, parent, isMain)
  }
  try {
    delete require.cache[require.resolve(handlerPath)]
    return { main: require(handlerPath).main, updates, deleted, downloads, checkedImages }
  } finally {
    Module._load = originalLoad
    delete require.cache[require.resolve(handlerPath)]
  }
}

test('云函数在原图下载结束前派生工作图，并保留原图元数据', async () => {
  let finishOriginal
  let finishDerive
  const originalReady = new Promise((resolve) => { finishOriginal = resolve })
  const derivedReady = new Promise((resolve) => { finishDerive = resolve })
  const asset = {
    userId: 'u', status: 'uploading',
    stagingPath: 'staging/u/original.jpg',
    workingStagingPath: 'staging/u/working.jpg'
  }
  const handler = loadHandler(asset, { originalReady, onDerive: finishDerive })
  const pending = handler.main({
    assetId: 'asset',
    fileID: 'cloud://env/staging/u/original.jpg',
    workingFileID: 'cloud://env/staging/u/working.jpg'
  })
  await derivedReady
  assert.deepEqual(handler.downloads, [
    'cloud://env/staging/u/original.jpg',
    'cloud://env/staging/u/working.jpg'
  ])
  finishOriginal()
  const response = await pending
  assert.equal(response.ok, true)
  assert.equal(response.data.metadata.width, 5712)
  assert.equal(response.data.metadata.orientation, 6)
  assert.equal(handler.updates.at(-1).status, 'ready')
  assert.equal(handler.updates.at(-1).originalFileId, 'cloud://env/original/u/asset.jpg')
  assert.deepEqual(handler.checkedImages, [WORKING, ORIGINAL])
  assert.deepEqual(handler.deleted, [
    'cloud://env/staging/u/original.jpg',
    'cloud://env/staging/u/working.jpg'
  ])
})

test('原图内容安全检查未通过时，不能把工作图标记为安全资产', async () => {
  const asset = {
    userId: 'u', status: 'uploading',
    stagingPath: 'staging/u/original.jpg',
    workingStagingPath: 'staging/u/working.jpg'
  }
  const handler = loadHandler(asset, { originalReady: Promise.resolve(), rejectOriginal: true })
  const response = await handler.main({
    assetId: 'asset',
    fileID: 'cloud://env/staging/u/original.jpg',
    workingFileID: 'cloud://env/staging/u/working.jpg'
  })
  assert.equal(response.ok, false)
  assert.equal(response.code, 'CONTENT_REJECTED')
  assert.equal(handler.updates.some((update) => update.status === 'ready'), false)
})

test('云函数拒绝非上传任务签发的工作图路径', async () => {
  const asset = {
    userId: 'u', status: 'uploading',
    stagingPath: 'staging/u/original.jpg',
    workingStagingPath: 'staging/u/working.jpg'
  }
  const handler = loadHandler(asset, { originalReady: Promise.resolve() })
  const response = await handler.main({
    assetId: 'asset',
    fileID: 'cloud://env/staging/u/original.jpg',
    workingFileID: 'cloud://env/staging/u/foreign.jpg'
  })
  assert.equal(response.ok, false)
  assert.equal(response.code, 'INVALID_ASSET')
  assert.deepEqual(handler.downloads, [])
})

test('原图超过像素上限时拒绝资产，即使工作图可解码', async () => {
  const asset = {
    userId: 'u', status: 'uploading',
    stagingPath: 'staging/u/original.jpg',
    workingStagingPath: 'staging/u/working.jpg'
  }
  const handler = loadHandler(asset, {
    originalReady: Promise.resolve(),
    originalMetadata: { format: 'jpeg', width: 10000, height: 7500, orientation: 6 }
  })
  const response = await handler.main({
    assetId: 'asset',
    fileID: 'cloud://env/staging/u/original.jpg',
    workingFileID: 'cloud://env/staging/u/working.jpg'
  })
  assert.equal(response.ok, false)
  assert.equal(response.code, 'INVALID_IMAGE')
})
