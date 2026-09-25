const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./security-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('图片检查只有微信明确通过才允许继续', async () => {
  const { checkImage } = loadCore()
  assert.equal(typeof checkImage, 'function')
  const calls = []
  await checkImage({ openapi: { security: { imgSecCheck: async (request) => {
    calls.push(request)
    return { errCode: 0 }
  } } } }, Buffer.from([1, 2, 3]))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].media.contentType, 'image/jpeg')
  assert.deepEqual(calls[0].media.value, Buffer.from([1, 2, 3]))
})

test('图片检查违规或接口不可用时阻断上传', async () => {
  const { checkImage } = loadCore()
  assert.equal(typeof checkImage, 'function')
  const cloud = (response) => ({ openapi: { security: { imgSecCheck: async () => response } } })
  await assert.rejects(checkImage(cloud({ errCode: 87014 }), Buffer.from([1])), /CONTENT_REJECTED/)
  await assert.rejects(checkImage(cloud({ errCode: 0, result: { suggest: 'risky' } }), Buffer.from([1])), /CONTENT_REJECTED/)
  await assert.rejects(checkImage(cloud({ errCode: -604101 }), Buffer.from([1])), /CONTENT_CHECK_UNAVAILABLE/)
  await assert.rejects(checkImage(cloud({}), Buffer.from([1])), /CONTENT_CHECK_UNAVAILABLE/)
})

test('文本检查要求微信新版接口明确返回 pass', async () => {
  const { checkText } = loadCore()
  assert.equal(typeof checkText, 'function')
  let request
  const cloud = { openapi: { security: { msgSecCheck: async (value) => {
    request = value
    return { errCode: 0, result: { suggest: 'pass' } }
  } } } }
  await checkText(cloud, '荷花开了', 'openid-1')
  assert.deepEqual(request, { content: '荷花开了', version: 2, scene: 4, openid: 'openid-1' })
})

test('文本风险、结果缺失及接口异常都不能公开', async () => {
  const { checkText } = loadCore()
  assert.equal(typeof checkText, 'function')
  const cloud = (response) => ({ openapi: { security: { msgSecCheck: async () => response } } })
  await assert.rejects(checkText(cloud({ errCode: 0, result: { suggest: 'risky' } }), '文字', 'id'), /CONTENT_REJECTED/)
  await assert.rejects(checkText(cloud({ errCode: 0 }), '文字', 'id'), /CONTENT_CHECK_UNAVAILABLE/)
  await assert.rejects(checkText({ openapi: { security: { msgSecCheck: async () => { throw { errCode: 87014 } } } } }, '文字', 'id'), /CONTENT_REJECTED/)
  await assert.rejects(checkText(cloud({ errCode: 0, result: { suggest: 'pass' } }), '文字', ''), /CONTENT_CHECK_UNAVAILABLE/)
})

test('每条创作与分享路径都采用相同的文本安全判定', async () => {
  const cores = [
    require('../createCreation/security-core'),
    require('../runCreation/security-core'),
    require('../createShareCard/security-core')
  ]
  for (const { checkText } of cores) {
    const cloud = (suggest) => ({ openapi: { security: { msgSecCheck: async () => ({ errCode: 0, result: { suggest } }) } } })
    await checkText(cloud('pass'), '荷花', 'openid-1')
    await assert.rejects(checkText(cloud('risky'), '风险文字', 'openid-1'), /CONTENT_REJECTED/)
    await assert.rejects(checkText(cloud(undefined), '无结果', 'openid-1'), /CONTENT_CHECK_UNAVAILABLE/)
  }
})
