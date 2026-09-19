const assert = require('node:assert/strict')
const test = require('node:test')

const loadCore = () => {
  try {
    return require('./profile-core')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return {}
    throw error
  }
}

test('normalizeProfile 只接受安全的微信昵称和 HTTPS 头像', () => {
  const { normalizeProfile } = loadCore()
  assert.equal(typeof normalizeProfile, 'function')

  assert.deepEqual(normalizeProfile({ nickName: '  小照  ', avatarUrl: 'https://wx.qlogo.cn/avatar.png' }), {
    nickName: '小照',
    avatarUrl: 'https://wx.qlogo.cn/avatar.png'
  })
  assert.equal(normalizeProfile({ nickName: '', avatarUrl: 'http://unsafe.example/avatar.png' }), null)
})

test('头像可先保存，昵称留待微信原生昵称控件填写', () => {
  const { normalizeProfile } = loadCore()

  assert.deepEqual(normalizeProfile({
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  }), {
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  })
  assert.equal(normalizeProfile({}), null)
})

test('资料更新使用云存储头像且不包含创作配额字段', () => {
  const { normalizeProfile, buildNewUserRecord, buildProfileUpdate, isOwnedAvatarFileId } = loadCore()
  assert.equal(typeof buildNewUserRecord, 'function')
  assert.equal(typeof buildProfileUpdate, 'function')
  assert.equal(typeof isOwnedAvatarFileId, 'function')

  const profile = normalizeProfile({
    nickName: '小照',
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  })
  assert.deepEqual(profile, {
    nickName: '小照',
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  })
  assert.deepEqual(buildNewUserRecord('o-user', profile), {
    openid: 'o-user',
    userId: 'o-user',
    nickName: '小照',
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  })
  assert.deepEqual(buildProfileUpdate('o-user', profile), {
    openid: 'o-user',
    userId: 'o-user',
    nickName: '小照',
    avatarFileId: 'cloud://env.bucket/users/o-user/profile/avatar.jpg'
  })
  assert.equal(isOwnedAvatarFileId(profile.avatarFileId, 'o-user'), true)
  assert.equal(isOwnedAvatarFileId(profile.avatarFileId, 'another-user'), false)
})
