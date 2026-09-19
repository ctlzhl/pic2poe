const normalizeProfile = (profile = {}) => {
  const nickName = String(profile.nickName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40)
  const avatarFileId = String(profile.avatarFileId || '').trim()
  const avatarUrl = String(profile.avatarUrl || '').trim()
  const safeAvatarFileId = avatarFileId.startsWith('cloud://') ? avatarFileId : ''
  const safeAvatarUrl = /^https:\/\//i.test(avatarUrl) ? avatarUrl : ''
  if (!nickName && !safeAvatarFileId && !safeAvatarUrl) return null
  if (safeAvatarFileId) return nickName ? { nickName, avatarFileId: safeAvatarFileId } : { avatarFileId: safeAvatarFileId }
  if (safeAvatarUrl) return nickName ? { nickName, avatarUrl: safeAvatarUrl } : { avatarUrl: safeAvatarUrl }
  return { nickName }
}

const buildNewUserRecord = (openid, profile) => ({ openid, userId: openid, ...profile })

const buildProfileUpdate = (openid, profile) => ({ openid, userId: openid, ...profile })

const isOwnedAvatarFileId = (fileId, openid) => String(fileId || '').includes(`/users/${openid}/profile/`)

module.exports = { normalizeProfile, buildNewUserRecord, buildProfileUpdate, isOwnedAvatarFileId }
