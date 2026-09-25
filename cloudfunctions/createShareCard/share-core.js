const canCreateShareForWork = (work, openid) => Boolean(work && work.userId === openid && work.status !== 'deleting')
const canReuseShareCard = (share) => Boolean(share?.fileId && share.safety?.status === 'passed')

module.exports = { canCreateShareForWork, canReuseShareCard }
