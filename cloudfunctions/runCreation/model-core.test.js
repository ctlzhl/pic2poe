const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  const path = require.resolve('./model-core')
  delete require.cache[path]
  return require('./model-core')
}

test('五言绝句与其他创作共用固定的 Qwen 快照模型', () => {
  const { QWEN_GENERATION_MODEL, getModelConfig } = loadCore()
  const config = getModelConfig({
    DASHSCOPE_API_KEY: 'key',
    DASHSCOPE_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  })

  assert.equal(QWEN_GENERATION_MODEL, 'qwen3.7-flash-2026-07-15')
  assert.equal(config.qwen.model, QWEN_GENERATION_MODEL)
  assert.equal(config.qwen.apiKey, 'key')
  assert.equal(config.qwen.baseUrl, 'https://dashscope.aliyuncs.com/compatible-mode/v1')
})

test('遗留模型环境变量不能覆盖固定的 Qwen 快照', () => {
  const { getModelConfig } = loadCore()
  const config = getModelConfig({
    QWEN_MODEL: 'qwen-next-snapshot',
    QWEN_VISION_MODEL: 'legacy-vision-model'
  })

  assert.equal(config.qwen.model, 'qwen3.7-flash-2026-07-15')
})
