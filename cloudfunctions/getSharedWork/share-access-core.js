const canReadPublicShare = (share) => Boolean(
  share?.creationFileId && share?.content && share?.type && share?.safety?.status === 'passed'
)

module.exports = { canReadPublicShare }
