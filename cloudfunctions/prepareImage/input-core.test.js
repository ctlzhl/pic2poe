const assert = require('node:assert/strict')
const test = require('node:test')

const { downloadAndDerive } = (() => {
  try { return require('./input-core') } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
})()

test('原图下载与工作图派生并行，派生输入是工作图', async () => {
  assert.equal(typeof downloadAndDerive, 'function')
  const started = []
  let finishOriginal
  const originalReady = new Promise((resolve) => { finishOriginal = resolve })
  let finishedDerivation
  const derivedReady = new Promise((resolve) => { finishedDerivation = resolve })
  const pending = downloadAndDerive({
    originalFileID: 'cloud://original',
    workingFileID: 'cloud://working',
    downloadFile: async (fileID) => {
      started.push(fileID)
      if (fileID === 'cloud://original') await originalReady
      return Buffer.from(fileID === 'cloud://original' ? 'original' : 'working')
    },
    derive: async (buffer) => {
      assert.equal(buffer.toString(), 'working')
      finishedDerivation()
      return 'derived'
    }
  })
  await derivedReady
  assert.deepEqual(started, ['cloud://original', 'cloud://working'])
  finishOriginal()
  const result = await pending
  assert.equal(result.originalBuffer.toString(), 'original')
  assert.equal(result.derived, 'derived')
  assert.equal(typeof result.timings.originalDownloadMs, 'number')
  assert.equal(typeof result.timings.workingDownloadMs, 'number')
})

test('没有工作图时沿用原图派生', async () => {
  const result = await downloadAndDerive({
    originalFileID: 'cloud://original',
    downloadFile: async () => Buffer.from('original'),
    derive: async (buffer) => buffer.toString().toUpperCase()
  })
  assert.equal(result.derived, 'ORIGINAL')
})

test('工作图只能使用上传任务预先签发的路径', () => {
  const { matchesUploadTicket } = require('./input-core')
  const asset = { stagingPath: 'staging/u/original.jpg', workingStagingPath: 'staging/u/working.jpg' }
  assert.equal(matchesUploadTicket(asset, 'cloud://env/staging/u/original.jpg', 'cloud://env/staging/u/working.jpg'), true)
  assert.equal(matchesUploadTicket(asset, 'cloud://env/staging/u/original.jpg', 'cloud://env/staging/u/foreign.jpg'), false)
  assert.equal(matchesUploadTicket(asset, 'cloud://env/staging/u/original.jpg', ''), true)
})
