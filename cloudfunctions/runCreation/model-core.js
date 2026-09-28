const QWEN_GENERATION_MODEL = 'qwen3.7-flash-2026-07-15'

const DEFAULT_MODEL_CONFIG = {
  promptVersion: 'p1-20260927',
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

module.exports = { QWEN_GENERATION_MODEL, getModelConfig, poemGenerationModel }
