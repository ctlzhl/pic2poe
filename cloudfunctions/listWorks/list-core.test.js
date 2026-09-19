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
