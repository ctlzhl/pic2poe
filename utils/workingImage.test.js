const assert = require('node:assert/strict')
const test = require('node:test')

const { createWorkingImage } = (() => {
  try { return require('./workingImage') } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
})()

test('为带旋转信息的大图制作等比例工作图，原路径不变', async () => {
  assert.equal(typeof createWorkingImage, 'function')
  const previousWx = global.wx
  let compressOptions
  global.wx = {
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 1536, height: 2048, orientation: 'up', type: 'jpeg' })
    },
    compressImage(options) {
      compressOptions = options
      options.success({ tempFilePath: '/tmp/working.jpg' })
    },
    getFileInfo({ success }) { success({ size: 720000 }) }
  }
  try {
    const result = await createWorkingImage('/tmp/original.jpg', 4886339)
    assert.deepEqual(result, { path: '/tmp/working.jpg', extension: 'jpg', bytes: 720000 })
    assert.equal(compressOptions.src, '/tmp/original.jpg')
    assert.equal(compressOptions.compressedWidth, 1536)
    assert.equal(compressOptions.compressedHeight, 2048)
  } finally {
    global.wx = previousWx
  }
})

test('方向不匹配时退回原图，避免生成横竖颠倒的工作图', async () => {
  const previousWx = global.wx
  global.wx = {
    getImageInfo({ src, success }) {
      success(src === '/tmp/original.jpg'
        ? { width: 5712, height: 4284, orientation: 'right', type: 'jpeg' }
        : { width: 2048, height: 1536, orientation: 'up', type: 'jpeg' })
    },
    compressImage({ success }) { success({ tempFilePath: '/tmp/wrong.jpg' }) },
    getFileInfo({ success }) { success({ size: 700000 }) }
  }
  try {
    assert.equal(await createWorkingImage('/tmp/original.jpg', 4886339), null)
  } finally {
    global.wx = previousWx
  }
})

test('工作图未显著缩小时继续沿用单图上传', async () => {
  const previousWx = global.wx
  let compressed = false
  global.wx = {
    getImageInfo({ success }) { success({ width: 1600, height: 1200, orientation: 'up', type: 'jpeg' }) },
    compressImage() { compressed = true }
  }
  try {
    assert.equal(await createWorkingImage('/tmp/small.jpg', 900000), null)
    assert.equal(compressed, false)
  } finally {
    global.wx = previousWx
  }
})
