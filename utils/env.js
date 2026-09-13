const SUPPORTED_ENVIRONMENTS = ['prod', 'test']
const DEFAULT_ENVIRONMENT = 'prod'
const SELECTED_ENVIRONMENT = 'prod'

const CURRENT_ENVIRONMENT = SUPPORTED_ENVIRONMENTS.includes(SELECTED_ENVIRONMENT)
  ? SELECTED_ENVIRONMENT
  : DEFAULT_ENVIRONMENT

const CLOUD_FUNCTION_MAP = {
  generatePoem: {
    prod: 'generatePoem',
    test: 'generatePoem_test'
  }
}

const STORAGE_PREFIX_MAP = {
  prod: 'prod',
  test: 'test'
}

const isProdEnvironment = () => CURRENT_ENVIRONMENT === 'prod'

const getCloudFunctionName = (key) => {
  if (!key) {
    return key
  }
  const mapping = CLOUD_FUNCTION_MAP[key]
  if (!mapping) {
    return key
  }
  return mapping[CURRENT_ENVIRONMENT] || mapping.prod || key
}

const getStoragePrefix = () => STORAGE_PREFIX_MAP[CURRENT_ENVIRONMENT] || STORAGE_PREFIX_MAP.prod

module.exports = {
  CURRENT_ENVIRONMENT,
  isProdEnvironment,
  getCloudFunctionName,
  getStoragePrefix
}
