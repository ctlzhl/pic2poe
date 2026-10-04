const QWEN_GENERATION_MODEL = 'qwen3.7-flash-2026-07-15'

const DEFAULT_MODEL_CONFIG = {
  promptVersion: 'p2-20261005',
  requestTimeoutMs: 18000,
  maxRetries: 1,
  visionTemperature: 0.2,
  generationTemperature: 0.7,
  visionMaxTokens: 500,
  generationMaxTokens: 600
}

const readNumberConfig = (environment, name, fallback, min, max, integer = false) => {
  const value = Number(environment[name])
  if (!Number.isFinite(value)) return fallback
  const normalized = Math.min(max, Math.max(min, value))
  return integer ? Math.round(normalized) : normalized
}

const getModelConfig = (environment = process.env) => ({
  qwen: {
    apiKey: environment.DASHSCOPE_API_KEY || '',
    baseUrl: environment.DASHSCOPE_BASE_URL || '',
    model: QWEN_GENERATION_MODEL
  },
  settings: {
    promptVersion: String(environment.MODEL_PROMPT_VERSION || DEFAULT_MODEL_CONFIG.promptVersion).slice(0, 80),
    requestTimeoutMs: readNumberConfig(environment, 'MODEL_REQUEST_TIMEOUT_MS', DEFAULT_MODEL_CONFIG.requestTimeoutMs, 3000, 25000, true),
    maxRetries: readNumberConfig(environment, 'MODEL_MAX_RETRIES', DEFAULT_MODEL_CONFIG.maxRetries, 0, 1, true),
    visionTemperature: readNumberConfig(environment, 'VISION_TEMPERATURE', DEFAULT_MODEL_CONFIG.visionTemperature, 0, 1, false),
    generationTemperature: readNumberConfig(environment, 'GENERATION_TEMPERATURE', DEFAULT_MODEL_CONFIG.generationTemperature, 0, 1, false),
    visionMaxTokens: readNumberConfig(environment, 'VISION_MAX_TOKENS', DEFAULT_MODEL_CONFIG.visionMaxTokens, 100, 1200, true),
    generationMaxTokens: readNumberConfig(environment, 'GENERATION_MAX_TOKENS', DEFAULT_MODEL_CONFIG.generationMaxTokens, 100, 1600, true)
  }
})

const poemGenerationModel = (config) => config.qwen

const buildVisionInstruction = (draft = {}) => {
  const schema = draft.generateType === 'review'
    ? '{"scene":"","subjects":[],"actions":[],"emotion":"","visualFocus":[],"photoTechnique":{"composition":"","lighting":"","color":"","clarity":"","depth":""}}'
    : '{"scene":"","subjects":[],"actions":[],"emotion":"","visualFocus":[]}'
  return [
    '只描述图片中可见内容，不推断身份、地点、敏感属性或不存在的故事。',
    `仅返回 JSON：${schema}。`,
    draft.generateType === 'review'
      ? 'photoTechnique 只记录画面可见的拍摄技术观察：构图和主体安排、光线与明暗、色彩、清晰度及画面层次。每项用一句具体描述；不能判断的项目填空字符串，不猜相机、镜头、曝光参数或后期操作。'
      : '',
    draft.location ? `用户填写地点：${draft.location}` : '',
    draft.moment ? `用户补充：${draft.moment}` : ''
  ].filter(Boolean).join('\n')
}

module.exports = { QWEN_GENERATION_MODEL, getModelConfig, poemGenerationModel, buildVisionInstruction }
