const cloud = require('wx-server-sdk')
const { normalizeProfile } = require('./profile-core')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const fail = (code, message) => ({ ok: false, code, message })

const getStoredProfile = async (openid) => {
  try {
    const result = await db.collection('users').doc(openid).get()
    return result.data || null
  } catch (error) {
    if (String(error?.message || '').includes('does not exist')) return null
    throw error
  }
}

const toPublicProfile = (profile) => profile ? {
  nickName: String(profile.nickName || ''),
  avatarUrl: String(profile.avatarUrl || '')
} : null

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID
  if (!openid) return fail('UNAUTHORIZED', '请先完成微信登录。')

  try {
    const existing = await getStoredProfile(openid)
    if (event.action !== 'save') {
      return { ok: true, data: { authorized: Boolean(existing?.nickName && existing?.avatarUrl), profile: toPublicProfile(existing) } }
    }

    const profile = normalizeProfile(event.profile)
    if (!profile) return fail('INVALID_PROFILE', '未获取到有效的微信资料，请重新授权。')

    await db.collection('users').doc(openid).set({
      data: {
        userId: openid,
        ...profile,
        createdAt: existing?.createdAt || db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    return { ok: true, data: { authorized: true, profile } }
  } catch (error) {
    console.error('读取或保存用户资料失败:', error)
    return fail('USER_PROFILE_FAILED', '登录资料保存失败，请稍后再试。')
  }
}
