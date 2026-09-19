const cloud = require('wx-server-sdk')
const { buildNewUserRecord, buildProfileUpdate, isOwnedAvatarFileId, normalizeProfile } = require('./profile-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const fail = (code, message) => ({ ok: false, code, message })
const LEGACY_PLACEHOLDER_NICKNAME = '微信用户'

const getStoredProfile = async (openid) => {
  try {
    const result = await db.collection('users').doc(openid).get()
    return result.data || null
  } catch (error) {
    if (String(error?.message || '').includes('does not exist')) return null
    throw error
  }
}

const toPublicProfile = async (profile) => {
  if (!profile) return null
  let avatarUrl = String(profile.avatarUrl || '')
  if (profile.avatarFileId) {
    try {
      const result = await cloud.getTempFileURL({ fileList: [profile.avatarFileId] })
      avatarUrl = String(result.fileList?.[0]?.tempFileURL || '')
    } catch (error) {
      console.warn('读取用户头像失败:', error?.message || error)
      avatarUrl = ''
    }
  }
  const nickName = String(profile.nickName || '') === LEGACY_PLACEHOLDER_NICKNAME ? '' : String(profile.nickName || '')
  return { nickName, avatarUrl }
}

const isCompleteProfile = (profile) => Boolean(profile?.nickName && profile.nickName !== LEGACY_PLACEHOLDER_NICKNAME && (profile?.avatarFileId || profile?.avatarUrl))
const createAvatarPath = (openid) => `users/${openid}/profile/avatar_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`

const deleteReplacedAvatar = async (previousFileId, nextFileId, openid) => {
  if (!previousFileId || previousFileId === nextFileId || !isOwnedAvatarFileId(previousFileId, openid)) return
  try {
    await cloud.deleteFile({ fileList: [previousFileId] })
  } catch (error) {
    console.warn('清理旧头像失败:', error?.message || error)
  }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  if (!openid) return fail('UNAUTHORIZED', '请先完成微信登录。')

  try {
    if (event.action === 'createAvatarUpload') {
      return { ok: true, data: { cloudPath: createAvatarPath(openid) } }
    }

    const existing = await getStoredProfile(openid)
    if (event.action !== 'save') {
      return { ok: true, data: { authorized: isCompleteProfile(existing), profile: await toPublicProfile(existing) } }
    }

    const incoming = event.profile && typeof event.profile === 'object' ? event.profile : {}
    const profile = normalizeProfile({
      nickName: incoming.nickName || (existing?.nickName === LEGACY_PLACEHOLDER_NICKNAME ? '' : existing?.nickName),
      avatarFileId: incoming.avatarFileId || existing?.avatarFileId,
      avatarUrl: incoming.avatarUrl || existing?.avatarUrl
    })
    if (!profile) return fail('INVALID_PROFILE', '未获取到有效的微信资料，请重新授权。')
    if (profile.avatarFileId && !isOwnedAvatarFileId(profile.avatarFileId, openid)) {
      return fail('INVALID_PROFILE', '头像上传信息无效，请重新选择。')
    }

    if (existing) {
      await db.collection('users').doc(openid).update({ data: { ...buildProfileUpdate(openid, profile), updatedAt: db.serverDate() } })
    } else {
      await db.collection('users').doc(openid).set({
        data: { ...buildNewUserRecord(openid, profile), createdAt: db.serverDate(), updatedAt: db.serverDate() }
      })
    }
    await deleteReplacedAvatar(existing?.avatarFileId, profile.avatarFileId, openid)
    return { ok: true, data: { authorized: isCompleteProfile(profile), profile: await toPublicProfile(profile) } }
  } catch (error) {
    console.error('读取或保存用户资料失败:', error)
    return fail('USER_PROFILE_FAILED', '登录资料保存失败，请稍后再试。')
  }
}
