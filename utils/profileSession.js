const PROFILE_SIGNED_IN_KEY = 'profileSignedIn:v1'

const isProfileSignedIn = () => {
  try { return typeof wx.getStorageSync === 'function' && wx.getStorageSync(PROFILE_SIGNED_IN_KEY) === true } catch (error) { return false }
}

const signOutProfile = () => wx.removeStorageSync(PROFILE_SIGNED_IN_KEY)
const signInProfile = () => wx.setStorageSync(PROFILE_SIGNED_IN_KEY, true)

module.exports = { isProfileSignedIn, signOutProfile, signInProfile }
