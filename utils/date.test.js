const assert = require('node:assert/strict')
const test = require('node:test')

const { formatDotDate } = require('./date')

test('统一将有效日期格式化为点分年月日', () => {
  assert.equal(formatDotDate('2026-09-20T08:30:00.000Z'), '2026.09.20')
})

test('无效日期不显示错误的默认日期', () => {
  assert.equal(formatDotDate('not-a-date'), '')
  assert.equal(formatDotDate(), '')
})
