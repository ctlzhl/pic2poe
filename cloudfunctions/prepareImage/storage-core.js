const uploadWithCompensation = async ({ uploads, uploadFile, afterUpload, cleanupFileIds }) => {
  let uploadedFileIds = []
  try {
    const settled = await Promise.allSettled(uploads.map((upload) => uploadFile(upload)))
    const results = settled
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    uploadedFileIds = results.map((result) => result?.fileID).filter(Boolean)
    const failed = settled.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
    if (afterUpload) await afterUpload(results)
    return results
  } catch (error) {
    if (uploadedFileIds.length > 0) await cleanupFileIds(uploadedFileIds)
    throw error
  }
}

module.exports = { uploadWithCompensation }
