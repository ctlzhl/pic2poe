const shouldDeleteAsset = (deletedWorkId, relatedWorks = []) => !relatedWorks.some((work) => work?._id && work._id !== deletedWorkId)

const findRemainingWork = (deletedWorkId, relatedWorks = []) => relatedWorks.find((work) => work?._id && work._id !== deletedWorkId) || null

const shareFileIdsForDeletion = (shares = []) => shares.map((share) => share?.fileId).filter(Boolean)

const revokeReadyShares = async (fetchBatch, revokeShare) => {
  const revoked = []
  const seen = new Set()
  while (true) {
    const batch = await fetchBatch()
    if (!batch.length) return revoked
    if (batch.some((share) => seen.has(share._id))) throw new Error('SHARE_REVOKE_STALLED')
    for (let index = 0; index < batch.length; index += 20) {
      const part = batch.slice(index, index + 20)
      await Promise.all(part.map(revokeShare))
      revoked.push(...part)
      part.forEach((share) => seen.add(share._id))
    }
  }
}

module.exports = { shouldDeleteAsset, findRemainingWork, shareFileIdsForDeletion, revokeReadyShares }
