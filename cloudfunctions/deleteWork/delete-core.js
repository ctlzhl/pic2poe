const shouldDeleteAsset = (deletedWorkId, relatedWorks = []) => !relatedWorks.some((work) => work?._id && work._id !== deletedWorkId)

const findRemainingWork = (deletedWorkId, relatedWorks = []) => relatedWorks.find((work) => work?._id && work._id !== deletedWorkId) || null

const shareFileIdsForDeletion = (shares = []) => shares.map((share) => share?.fileId).filter(Boolean)

module.exports = { shouldDeleteAsset, findRemainingWork, shareFileIdsForDeletion }
