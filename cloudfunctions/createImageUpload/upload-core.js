const createStagingPath = (openid, token, extension) => `staging/${openid}/${token}.${extension}`

module.exports = { createStagingPath }
