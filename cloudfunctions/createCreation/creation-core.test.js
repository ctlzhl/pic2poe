const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./creation-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('旧资料记录仍会被识别为同一用户，避免创建配额覆盖资料', () => {
  const { findUserRecord } = loadCore()
  assert.equal(typeof findUserRecord, 'function')

  assert.deepEqual(
    findUserRecord('o-user', [{ _id: 'o-user', userId: 'o-user', nickName: '小照' }]),
    { _id: 'o-user', userId: 'o-user', nickName: '小照' }
  )
  assert.equal(findUserRecord('o-user', [{ _id: 'other', userId: 'other' }]), null)
})
