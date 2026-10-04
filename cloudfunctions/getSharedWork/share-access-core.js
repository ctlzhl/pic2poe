const canReadPublicShare = (share) => Boolean(
  share?.creationFileId && share?.content && share?.type && share?.safety?.status === 'passed' && share?.safety?.cardChecked === true
)

module.exports = { canReadPublicShare }
