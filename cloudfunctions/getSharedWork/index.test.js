const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

test('公开快照必须对应仍存在的原作品', async () => {
  const token = 'a'.repeat(24)
  const share = {
    workId: 'work-1', userId: 'owner-1', shareToken: token,
    creationFileId: 'cloud://creation', fileId: 'cloud://share',
    type: 'poem', content: { poem: { title: '春日', lines: [] } },
    safety: { status: 'passed', cardChecked: true }
  }
  let workExists = false
  let tempUrlCalls = 0
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'env', init() {},
    database: () => ({ collection: (name) => ({
      where: () => ({ limit: () => ({ get: async () => ({
        data: name === 'shareCards' ? [share] : workExists ? [{ _id: 'work-1', userId: 'owner-1' }] : []
      }) }) })
    }) }),
    getTempFileURL: async () => { tempUrlCalls += 1; return { fileList: [{ tempFileURL: 'https://example.test/image.jpg' }] } }
  }
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloud
    return originalLoad.call(this, request, parent, isMain)
  }
  let main
  try {
    const handlerPath = path.join(__dirname, 'index.js')
    delete require.cache[require.resolve(handlerPath)]
    main = require(handlerPath).main
  } finally {
    Module._load = originalLoad
  }

  const missing = await main({ shareToken: token })
  assert.equal(missing.code, 'SHARE_NOT_FOUND')
  assert.equal(tempUrlCalls, 0)

  workExists = true
  const available = await main({ shareToken: token })
  assert.equal(available.ok, true)
  assert.equal(available.data.shareToken, token)
  assert.equal(tempUrlCalls, 2)
})
