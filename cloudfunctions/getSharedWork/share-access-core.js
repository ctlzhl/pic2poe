const canReadPublicShare = (share, work) => Boolean(
  share?.workId && work?._id === share.workId && work.userId === share.userId &&
  share.creationFileId && share.content && share.type &&
  share.safety?.status === 'passed' && share.safety?.cardChecked === true
)

module.exports = { canReadPublicShare }
