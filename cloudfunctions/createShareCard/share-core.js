const canCreateShareForWork = (work, openid) => Boolean(work && work.userId === openid && work.status !== 'deleting')
const canReuseShareCard = (share) => Boolean(share?.fileId && share.safety?.status === 'passed' && share.safety?.cardChecked === true)

module.exports = { canCreateShareForWork, canReuseShareCard }
