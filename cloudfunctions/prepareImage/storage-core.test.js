const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./storage-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('派生图片上传中途失败时回收已经上传的文件', async () => {
  const { uploadWithCompensation } = loadCore()
  assert.equal(typeof uploadWithCompensation, 'function')

  const deleted = []
  let calls = 0
  await assert.rejects(
    uploadWithCompensation({
      uploads: [{ cloudPath: 'a' }, { cloudPath: 'b' }, { cloudPath: 'c' }],
      uploadFile: async () => {
        calls += 1
        if (calls === 3) throw new Error('upload failed')
        return { fileID: `cloud://${calls}` }
      },
      cleanupFileIds: async (fileIds) => { deleted.push(...fileIds) }
    }),
    /upload failed/
  )
  assert.deepEqual(deleted, ['cloud://1', 'cloud://2'])
})

test('派生图片上传后写入资产失败时回收全部文件', async () => {
  const { uploadWithCompensation } = loadCore()
  const deleted = []

  await assert.rejects(
    uploadWithCompensation({
      uploads: [{ cloudPath: 'a' }, { cloudPath: 'b' }, { cloudPath: 'c' }],
      uploadFile: async ({ cloudPath }) => ({ fileID: `cloud://${cloudPath}` }),
      afterUpload: async () => { throw new Error('database failed') },
      cleanupFileIds: async (fileIds) => { deleted.push(...fileIds) }
    }),
    /database failed/
  )
  assert.deepEqual(deleted, ['cloud://a', 'cloud://b', 'cloud://c'])
})

test('原图与派生图会并行上传以缩短预处理等待', async () => {
  const { uploadWithCompensation } = loadCore()
  const started = []
  let releaseUploads
  const uploadsReady = new Promise((resolve) => { releaseUploads = resolve })

  const pending = uploadWithCompensation({
    uploads: [{ cloudPath: 'original' }, { cloudPath: 'creation' }, { cloudPath: 'thumbnail' }],
    uploadFile: async ({ cloudPath }) => {
      started.push(cloudPath)
      await uploadsReady
      return { fileID: `cloud://${cloudPath}` }
    },
    cleanupFileIds: async () => {}
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(started, ['original', 'creation', 'thumbnail'])
  releaseUploads()
  await pending
})
