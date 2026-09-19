const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./cleanup-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('单个文件删除失败时保留资产供下一轮清理', () => {
  const { assertFilesDeleted } = loadCore()
  assert.equal(typeof assertFilesDeleted, 'function')
  assert.throws(
    () => assertFilesDeleted({ fileList: [{ fileID: 'cloud://keep.jpg', status: -1 }] }),
    /cloud:\/\/keep.jpg/
  )
})
