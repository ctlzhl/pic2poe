const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./list-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('作品列表默认每页十条并计算分页偏移', () => {
  const { parsePagination } = loadCore()
  assert.equal(typeof parsePagination, 'function')

  assert.deepEqual(parsePagination({}), { page: 1, limit: 10, skip: 0 })
  assert.deepEqual(parsePagination({ page: 3, limit: 99 }), { page: 3, limit: 10, skip: 20 })
  assert.deepEqual(parsePagination({ page: -1, limit: 8 }), { page: 1, limit: 8, skip: 0 })
})

test('一页作品的图片资产只查询一次，并按 ID 对应而非数据库返回顺序匹配', async () => {
  const { readAssetsByIds } = loadCore()
  assert.equal(typeof readAssetsByIds, 'function')
  let queryCount = 0
  const db = {
    command: { in: (ids) => ({ $in: ids }) },
    collection(name) {
      assert.equal(name, 'imageAssets')
      return {
        where(query) {
          queryCount += 1
          assert.deepEqual(query, { _id: { $in: ['asset-a', 'asset-b', 'asset-c'] } })
          return { get: async () => ({ data: [
            { _id: 'asset-b', userId: 'owner', thumbnailFileId: 'cloud://b' },
            { _id: 'asset-a', userId: 'owner', thumbnailFileId: 'cloud://a' },
            { _id: 'asset-c', userId: 'someone-else', thumbnailFileId: 'cloud://private' }
          ] }) }
        }
      }
    }
  }

  const assets = await readAssetsByIds(db, ['asset-a', 'asset-b', 'asset-c', 'asset-a', '', null], 'owner')
  assert.equal(queryCount, 1)
  assert.equal(assets.get('asset-a')?.thumbnailFileId, 'cloud://a')
  assert.equal(assets.get('asset-b')?.thumbnailFileId, 'cloud://b')
  assert.equal(assets.has('asset-c'), false)
  assert.equal(assets.has(''), false)
})
