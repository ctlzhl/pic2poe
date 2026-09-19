const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./retry-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('重试前会阻止同一用户已有的运行中任务', () => {
  const { hasActiveTask } = loadCore()
  assert.equal(typeof hasActiveTask, 'function')
  assert.equal(hasActiveTask([{ status: 'generating' }]), true)
  assert.equal(hasActiveTask([{ status: 'failed' }, { status: 'succeeded' }]), false)
})
