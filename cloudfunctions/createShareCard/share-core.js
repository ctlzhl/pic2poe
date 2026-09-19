const canCreateShareForWork = (work, openid) => Boolean(work && work.userId === openid && work.status !== 'deleting')

module.exports = { canCreateShareForWork }
