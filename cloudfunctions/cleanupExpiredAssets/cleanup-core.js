const failedDeletionFileIds = (result = {}) => (Array.isArray(result.fileList) ? result.fileList : [])
  .filter((file) => Number(file?.status) !== 0)
  .map((file) => file.fileID)
  .filter(Boolean)

const assertFilesDeleted = (result) => {
  const failed = failedDeletionFileIds(result)
  if (failed.length > 0) throw new Error(`FILE_DELETE_FAILED:${failed.join(',')}`)
}

module.exports = { assertFilesDeleted }
