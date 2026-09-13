const normalizeProfile = (profile = {}) => {
  const nickName = String(profile.nickName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40)
  const avatarUrl = String(profile.avatarUrl || '').trim()
  if (!nickName || !/^https:\/\//i.test(avatarUrl)) return null
  return { nickName, avatarUrl }
}

module.exports = { normalizeProfile }
