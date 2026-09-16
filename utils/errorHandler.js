/**
 * 错误提示优化工具
 * 将技术错误信息转换为用户友好的提示
 */

/**
 * 错误模式映射表
 * 按优先级从高到低匹配
 */
const ERROR_PATTERNS = [
  // 权限相关错误
  {
    patterns: [/auth deny|auth denied|permission denied/i],
    message: '暂无权限'
  },

  // 网络连接相关错误
  {
    patterns: [/network.*fail|网络.*失败|connection.*fail|request timeout|连接.*失败|连接.*超时/i],
    message: '网络连接失败，请稍后再试'
  },

  // AI服务超时
  {
    patterns: [/AI.*timeout|诗歌生成.*timeout|超时.*诗歌/i],
    message: '连接超时，诗歌生成失败'
  },

  // 文件过大
  {
    patterns: [/fail_size|too large|图片.*过大|file too big/i],
    message: '图片过大，请选择 6MB 以内的图片'
  },

  // 新版图片格式
  {
    patterns: [/暂不支持这种图片格式|JPG、PNG 或 WebP/i],
    message: '暂不支持这种图片格式，请选择 JPG、PNG 或 WebP。'
  },

  // 服务器错误
  {
    patterns: [/server.*error|服务器.*错误|500|502|503|504/i],
    message: '服务器连接失败'
  },

  // 格式错误/无效请求
  {
    patterns: [/invalid.*request|invalid.*parameter|格式错误|无效请求/i],
    message: '无效请求，请重试'
  },

  // 文件下载相关
  {
    patterns: [/download.*fail|下载.*失败/i],
    message: '图片下载失败，请检查网络'
  },

  // 文件上传相关
  {
    patterns: [/upload.*fail|上传.*失败/i],
    message: '图片上传失败，请检查网络'
  },

  // 文件类型错误
  {
    patterns: [/invalid file type|文件类型|file type/i],
    message: '不支持的文件格式，请选择图片'
  },

  // 文件未选择（用户取消）
  {
    patterns: [/no file chosen|cancel|未选择|用户取消/i],
    message: '' // 空字符串表示不需要提示
  },

  // AI服务通用错误
  {
    patterns: [/AI.*错误|AI.*失败|诗歌生成.*失败/i],
    message: '诗歌生成失败，请稍后重试'
  },

  // 云存储链接相关
  {
    patterns: [/图片链接.*失效|链接.*失效|link.*expire/i],
    message: '图片链接失效，请重新创作'
  },

  // 保存到相册相关
  {
    patterns: [/save.*fail|保存.*失败/i],
    message: '保存失败，请检查相册权限'
  }
]

/**
 * 根据错误信息获取友好的错误提示
 * @param {Error|string} error - 错误对象或错误信息
 * @param {string} defaultMessage - 默认错误提示
 * @returns {string} 友好的错误提示信息
 */
const getFriendlyErrorMessage = (error, defaultMessage = '操作失败，请稍后重试') => {
  // 1. 提取错误信息
  let errorText = ''

  if (typeof error === 'string') {
    errorText = error
  } else if (error?.message) {
    errorText = error.message
  } else if (error?.errMsg) {
    errorText = error.errMsg
  } else if (typeof error === 'object') {
    errorText = JSON.stringify(error)
  }

  if (!errorText) {
    return defaultMessage
  }

  // 2. 遍历错误模式，查找匹配项
  for (const { patterns, message } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(errorText)) {
        // 如果消息为空字符串，表示不需要提示用户
        if (message === '') {
          return ''
        }
        return message
      }
    }
  }

  // 3. 如果没有匹配到，返回默认消息
  return defaultMessage
}

/**
 * 显示友好的错误提示（Toast）
 * @param {Error|string} error - 错误对象或错误信息
 * @param {string} defaultMessage - 默认错误提示
 */
const showErrorToast = (error, defaultMessage = '操作失败，请稍后重试') => {
  const message = getFriendlyErrorMessage(error, defaultMessage)

  // 如果不需要提示，直接返回
  if (!message) {
    return
  }

  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  })
}

module.exports = {
  showErrorToast
}
