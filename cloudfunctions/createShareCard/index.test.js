const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

const CARD = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3])

const loadHandler = ({ reusable, rejectImage = true, concurrent = false, staleCard = false }) => {
  const writes = []
  const checks = []
  const publishedCards = []
  const work = {
    _id: 'work', userId: 'user', status: 'ready', imageAssetId: 'asset', draftId: 'draft',
    type: 'copy', content: { copy: { headline: '此刻', body: '留住这一刻' } }, safety: { status: 'passed' }
  }
  const asset = {
    _id: 'asset', userId: 'user', creationFileId: 'cloud://creation', safety: { status: 'passed' }
  }
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'env',
    init() {},
    getWXContext: () => ({ OPENID: 'user' }),
    database: () => ({
      serverDate: () => new Date(),
      collection: (name) => ({
        doc: (id) => ({
          get: async () => ({ data: name === 'works' ? work : name === 'imageAssets' ? asset : name === 'shareCards' ? publishedCards.find((card) => card._id === id) : { location: '' } }),
          update: async (value) => { writes.push(value) }
        }),
        where: () => ({ limit: () => ({ get: async () => ({ data: staleCard ? [reusable] : concurrent ? publishedCards.slice(0, 1) : reusable ? [reusable] : [] }) }) })
      }),
      runTransaction: async (callback) => callback({
        collection: (name) => ({
          doc: () => ({ get: async () => ({ data: name === 'works' ? work : asset }) }),
          add: async ({ data }) => {
            if ((concurrent || staleCard) && publishedCards.some((card) => card._id === data._id)) throw new Error('DUPLICATE_KEY')
            writes.push({ published: data })
            publishedCards.push(data)
          }
        })
      })
    }),
    downloadFile: async () => ({ fileContent: CARD }),
    uploadFile: async ({ cloudPath }) => {
      if (concurrent || staleCard) {
        writes.push({ uploadedPath: cloudPath })
        return { fileID: `cloud://${cloudPath}` }
      }
      writes.push('uploaded')
      return { fileID: 'cloud://new-card' }
    },
    deleteFile: async ({ fileList }) => { writes.push({ deletedFiles: fileList }); return { fileList: fileList.map((fileID) => ({ fileID, status: 0 })) } },
    getTempFileURL: async ({ fileList }) => ({ fileList: staleCard && fileList[0] === reusable.fileId ? [] : [{ tempFileURL: 'https://example.test/card.jpg' }] }),
    openapi: {
      wxacode: { getUnlimited: async () => ({ buffer: CARD }) },
      security: { imgSecCheck: async ({ media }) => {
        checks.push(media.value)
        return { errCode: rejectImage ? 87014 : 0 }
      } }
    }
  }
  const sharp = () => {
    const pipeline = {
      metadata: async () => ({ format: 'jpeg', width: 800, height: 600 }),
      rotate: () => pipeline,
      resize: () => pipeline,
      flatten: () => pipeline,
      jpeg: () => pipeline,
      png: () => pipeline,
      composite: () => pipeline,
      toBuffer: async () => CARD
    }
    return pipeline
  }
  const handlerPath = path.join(__dirname, 'index.js')
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloud
    if (request === 'sharp') return sharp
    return originalLoad.call(this, request, parent, isMain)
  }
  try {
    delete require.cache[require.resolve(handlerPath)]
    const main = require(handlerPath).main
    return {
      main: async (event) => {
        Module._load = function (request, parent, isMain) {
          if (request === 'sharp') return sharp
          return originalLoad.call(this, request, parent, isMain)
        }
        try {
          return await main(event)
        } finally {
          Module._load = originalLoad
        }
      },
      writes,
      checks
    }
  } finally {
    Module._load = originalLoad
    delete require.cache[require.resolve(handlerPath)]
  }
}

test('旧分享图未经成品图内容审核时不能补标安全', async () => {
  const handler = loadHandler({ reusable: {
    _id: 'share', fileId: 'cloud://card', shareToken: 'token', shareTitle: '此刻', safety: { status: 'pending' }
  } })
  const result = await handler.main({ workId: 'work' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'CONTENT_REJECTED')
  assert.equal(handler.checks.length, 1)
  assert.deepEqual(handler.writes, [])
})

test('新分享图成品审核拒绝时不能上传或发布', async () => {
  const handler = loadHandler({ reusable: null })
  const result = await handler.main({ workId: 'work' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'CONTENT_REJECTED')
  assert.equal(handler.checks.length, 1)
  assert.deepEqual(handler.writes, [])
})

test('旧卡成品复检通过后才补记安全标识', async () => {
  const handler = loadHandler({
    reusable: { _id: 'share', fileId: 'cloud://card', shareToken: 'token', shareTitle: '此刻', safety: { status: 'passed' } },
    rejectImage: false
  })
  const result = await handler.main({ workId: 'work' })
  assert.equal(result.ok, true)
  assert.equal(handler.checks.length, 1)
  assert.equal(handler.writes[0].data.safety.cardChecked, true)
})

test('新卡成品审核通过后才发布带复检标识的快照', async () => {
  const handler = loadHandler({ reusable: null, rejectImage: false })
  const result = await handler.main({ workId: 'work' })
  assert.equal(result.ok, true)
  assert.equal(handler.checks.length, 1)
  assert.equal(handler.writes[0], 'uploaded')
  assert.equal(handler.writes[1].published.safety.cardChecked, true)
})

test('同一作品并发生成只发布一个凭证，失败请求不会删除成功的图片', async () => {
  const handler = loadHandler({ reusable: null, rejectImage: false, concurrent: true })
  const results = await Promise.all([
    handler.main({ workId: 'work' }),
    handler.main({ workId: 'work' })
  ])
  const published = handler.writes.filter((write) => write.published).map((write) => write.published)
  const uploadedPaths = handler.writes.filter((write) => write.uploadedPath).map((write) => write.uploadedPath)
  const deletedFiles = handler.writes.flatMap((write) => write.deletedFiles || [])

  assert.equal(results.every((result) => result.ok), true)
  assert.equal(results[0].data.shareToken, results[1].data.shareToken)
  assert.equal(published.length, 1)
  assert.equal(new Set(uploadedPaths).size, uploadedPaths.length)
  assert.equal(deletedFiles.includes(published[0].fileId), false)
})

test('旧分享图文件失效后重建，新记录再次读取仍可复用', async () => {
  const oldCard = {
    _id: 'legacy', fileId: 'cloud://missing-card', shareToken: 'old-token',
    shareTitle: '旧卡', safety: { status: 'passed', cardChecked: true }
  }
  const handler = loadHandler({ reusable: oldCard, rejectImage: false, staleCard: true })
  const first = await handler.main({ workId: 'work' })
  const second = await handler.main({ workId: 'work' })
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(first.data.shareToken, second.data.shareToken)
  assert.equal(handler.writes.filter((write) => write.published).length, 1)
})
