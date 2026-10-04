const assert = require('node:assert/strict')
const test = require('node:test')
const { validateContent, callWithRetry } = require('./creation-core')

test('拒绝图评正文或观察项中的非字符串，避免作品列表读取失败', () => {
  assert.throws(() => validateContent('review', {
    type: 'review', review: { headline: '画面', body: { text: '正文' }, observations: ['光线', '构图'] }
  }), /INVALID_OUTPUT/)
  assert.throws(() => validateContent('review', {
    type: 'review', review: { headline: '画面', body: '正文', observations: ['光线', { text: '构图' }] }
  }), /INVALID_OUTPUT/)
})

test('拒绝混入非汉字的诗句及非字符串文案标签', () => {
  assert.throws(() => validateContent('poem', {
    type: 'poem', poem: { title: '晨光', lines: ['晨光照山林A', '清风过小桥', '远云随水去', '归鸟入林梢'] }
  }), /INVALID_OUTPUT/)
  assert.throws(() => validateContent('copy', {
    type: 'copy', copy: { headline: '清晨', body: '一束光', hashtags: ['早晨', { text: '摄影' }] }
  }), /INVALID_OUTPUT/)
})

test('合法的三类创作结果仍可使用', () => {
  const outputs = [
    ['poem', { type: 'poem', poem: { title: '晨光', lines: ['晨光照山林', '清风过小桥', '远云随水去', '归鸟入林梢'] } }],
    ['review', { type: 'review', review: { headline: '柔和的光', body: '光线让主体更加突出。', observations: ['主体清楚', '明暗自然'] } }],
    ['copy', { type: 'copy', copy: { headline: '这一刻', body: '记下眼前的风景。', hashtags: ['风景'] } }]
  ]
  for (const [type, output] of outputs) assert.equal(validateContent(type, output), output)
})

test('每次模型重试都受任务剩余时限约束', async () => {
  let now = 0
  const receivedTimeouts = []
  const task = { deadlineAt: new Date(60000) }
  await assert.rejects(() => callWithRetry(task, { requestTimeoutMs: 18000, maxRetries: 1 }, async (timeoutMs) => {
    receivedTimeouts.push(timeoutMs)
    now = 53000
    const error = new Error('rate limited')
    error.status = 429
    throw error
  }, () => now), /TASK_TIMEOUT/)
  assert.deepEqual(receivedTimeouts, [18000])
})

test('临近截止时间时压缩模型请求时限，并不重试不可恢复错误', async () => {
  const task = { deadlineAt: new Date(12000) }
  const timeouts = []
  await assert.rejects(() => callWithRetry(task, { requestTimeoutMs: 18000, maxRetries: 1 }, async (timeoutMs) => {
    timeouts.push(timeoutMs)
    const error = new Error('forbidden')
    error.status = 403
    throw error
  }, () => 1000), /forbidden/)
  assert.deepEqual(timeouts, [6000])
})

test('模型返回格式不合格时，在剩余预算内只修正一次', async () => {
  let calls = 0
  const result = await callWithRetry({ deadlineAt: new Date(60000) }, {
    requestTimeoutMs: 18000, maxRetries: 1
  }, async (timeoutMs, retryCount) => {
    calls += 1
    assert.equal(timeoutMs, 18000)
    if (retryCount === 0) throw new Error('INVALID_OUTPUT')
    return { content: '修正后的正文' }
  }, () => 0)
  assert.equal(calls, 2)
  assert.equal(result.content, '修正后的正文')
  assert.equal(result.retryCount, 1)
})
