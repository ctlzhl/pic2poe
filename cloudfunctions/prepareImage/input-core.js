const downloadAndDerive = async ({ originalFileID, workingFileID, downloadFile, derive }) => {
  const startedAt = Date.now()
  const originalStartedAt = Date.now()
  // 先发起原图下载，让它与较小工作图的下载、派生重叠。
  const originalPromise = downloadFile(originalFileID).then(
    (buffer) => ({ buffer, durationMs: Date.now() - originalStartedAt }),
    (error) => ({ error, durationMs: Date.now() - originalStartedAt })
  )

  let workingBuffer
  let workingDownloadMs = 0
  if (workingFileID) {
    const startedAt = Date.now()
    workingBuffer = await downloadFile(workingFileID)
    workingDownloadMs = Date.now() - startedAt
  } else {
    const original = await originalPromise
    if (original.error) throw original.error
    workingBuffer = original.buffer
  }

  const deriveStartedAt = Date.now()
  const derived = await derive(workingBuffer)
  const deriveMs = Date.now() - deriveStartedAt
  const original = await originalPromise
  if (original.error) throw original.error
  return {
    originalBuffer: original.buffer,
    derived,
    timings: { originalDownloadMs: original.durationMs, workingDownloadMs, deriveMs, inputWallMs: Date.now() - startedAt }
  }
}

const matchesUploadTicket = (asset, originalFileID, workingFileID) => {
  if (!asset?.stagingPath || typeof originalFileID !== 'string' || !originalFileID.endsWith(`/${asset.stagingPath}`)) return false
  if (!workingFileID) return true
  return Boolean(asset.workingStagingPath && typeof workingFileID === 'string' && workingFileID.endsWith(`/${asset.workingStagingPath}`))
}

module.exports = { downloadAndDerive, matchesUploadTicket }
