const createStagingPath = (openid, token, extension) => `staging/${openid}/${token}.${extension}`
const createWorkingStagingPath = (openid, token, extension) => `staging/${openid}/${token}-work.${extension}`
const createUploadPaths = (openid, token, extension, workingExtension) => ({
  stagingPath: createStagingPath(openid, token, extension),
  workingStagingPath: workingExtension ? createWorkingStagingPath(openid, token, workingExtension) : ''
})

module.exports = { createStagingPath, createWorkingStagingPath, createUploadPaths }
