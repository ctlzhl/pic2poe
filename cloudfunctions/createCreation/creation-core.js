const findUserRecord = (openid, records = []) => records.find((user) => user?._id === openid || user?.openid === openid || user?.userId === openid) || null

module.exports = { findUserRecord }
