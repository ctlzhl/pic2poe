/**
 * 网络请求超时控制工具
 * 为微信小程序的文件操作和云函数调用提供超时保护
 */

// 超时配置（单位：毫秒）
const TIMEOUT_CONFIG = {
  DOWNLOAD: 15000,       // 下载文件：15秒
  UPLOAD: 30000,         // 上传文件：30秒
  CLOUD_FUNCTION: 20000, // 云函数调用：20秒
  SAVE_ALBUM: 10000      // 保存到相册：10秒
}

/**
 * 带超时的文件下载
 * @param {string} url - 文件URL
 * @param {number} timeout - 超时时间（毫秒），默认15秒
 * @returns {Promise} 包含下载结果的Promise
 */
const downloadFileWithTimeout = (url, timeout = TIMEOUT_CONFIG.DOWNLOAD) => {
  return new Promise((resolve, reject) => {
    // 设置超时定时器
    const timer = setTimeout(() => {
      reject(new Error('下载超时，请检查网络后重试'))
    }, timeout)

    wx.downloadFile({
      url,
      success: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

/**
 * 带超时的文件上传
 * @param {string} cloudPath - 云存储路径
 * @param {string} filePath - 本地文件路径
 * @param {number} timeout - 超时时间（毫秒），默认30秒
 * @returns {Promise} 包含上传结果的Promise
 */
const uploadFileWithTimeout = (cloudPath, filePath, timeout = TIMEOUT_CONFIG.UPLOAD) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('上传超时，请检查网络后重试'))
    }, timeout)

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

/**
 * 带超时的云函数调用
 * @param {string} name - 云函数名称
 * @param {object} data - 传递的数据
 * @param {number} timeout - 超时时间（毫秒），默认20秒
 * @returns {Promise} 包含云函数调用结果的Promise
 */
const callFunctionWithTimeout = (name, data, timeout = TIMEOUT_CONFIG.CLOUD_FUNCTION) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('请求超时，请稍后重试'))
    }, timeout)

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

/**
 * 带超时的保存到相册
 * @param {string} filePath - 文件路径
 * @param {number} timeout - 超时时间（毫秒），默认10秒
 * @returns {Promise} 包含保存结果的Promise
 */
const saveToAlbumWithTimeout = (filePath, timeout = TIMEOUT_CONFIG.SAVE_ALBUM) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('保存超时，请稍后重试'))
    }, timeout)

    wx.saveImageToPhotosAlbum({
      filePath,
      success: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

module.exports = {
  TIMEOUT_CONFIG,
  downloadFileWithTimeout,
  uploadFileWithTimeout,
  callFunctionWithTimeout,
  saveToAlbumWithTimeout
}
