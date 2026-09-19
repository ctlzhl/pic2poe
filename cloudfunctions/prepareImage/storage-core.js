const uploadWithCompensation = async ({ uploads, uploadFile, afterUpload, cleanupFileIds }) => {
  const results = []
  const uploadedFileIds = []
  try {
    for (const upload of uploads) {
      const result = await uploadFile(upload)
      results.push(result)
      if (result?.fileID) uploadedFileIds.push(result.fileID)
    }
    if (afterUpload) await afterUpload(results)
    return results
  } catch (error) {
    if (uploadedFileIds.length > 0) await cleanupFileIds(uploadedFileIds)
    throw error
  }
}

module.exports = { uploadWithCompensation }
