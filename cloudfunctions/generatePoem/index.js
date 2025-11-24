
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { fileID } = event
  const startTime = Date.now()
  
  try {
    console.log('开始处理，图片文件ID:', fileID)
    console.log('云函数启动时间:', new Date(startTime).toISOString())

    // 1. 获取图片临时下载链接
    const getUrlStart = Date.now()
    console.log('尝试获取图片临时URL...')
    console.log('fileID类型:', typeof fileID, '值:', fileID)
    
    // 确保fileID是字符串且非空
    if (!fileID || typeof fileID !== 'string') {
      throw new Error('无效的fileID参数，必须是非空字符串')
    }

    const fileResult = await cloud.getTempFileURL({
      fileList: [{
        fileID: fileID,
        maxAge: 60 * 60 // 1小时有效期
      }]
    })
    console.log(`获取图片URL耗时: ${Date.now() - getUrlStart}ms`)

    // 2. 生成压缩图片URL
    const compressStart = Date.now()
    console.log('生成压缩图片URL...')
    const compressedUrl = `${fileResult.fileList[0].tempFileURL}?imageMogr2/thumbnail/500x`
    console.log(`生成压缩URL耗时: ${Date.now() - compressStart}ms`)

    // 3. 调用智谱AI生成诗歌
    const aiStart = Date.now()
    console.log('开始调用智谱AI...')
    // 详细调试信息
    console.log('ZHIPU_API_KEY:', process.env.ZHIPU_API_KEY ? '已设置' : '未设置')
    if (process.env.ZHIPU_API_KEY) {
      console.log('密钥长度:', process.env.ZHIPU_API_KEY.length)
      console.log('密钥前5位:', process.env.ZHIPU_API_KEY.slice(0, 5))
      console.log('密钥后5位:', process.env.ZHIPU_API_KEY.slice(-5))
    }
    
    // 调试输出完整请求配置
    const requestConfig = {
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      method: 'post',
      data: {
        model: 'GLM-4.5V',
        messages: [
          {
            role: 'user',
            content: `请根据这张图片的意境创作一首诗: ${compressedUrl}`
          }
        ],
        temperature: 0.7
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
      },
      timeout: 10000
    }
    console.log('请求配置:', JSON.stringify(requestConfig, null, 2))
    
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'GLM-4.5V',
        messages: [
          {
            role: 'user',
            content: `请根据这张图片的意境创作一首诗: ${compressedUrl}`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`
        },
        timeout: 10000 // 10秒超时
      }
    )

    const poem = response.data.choices[0].message.content
    console.log(`AI调用完成，耗时: ${Date.now() - aiStart}ms`)
    console.log('生成的诗歌:', poem)

    // 4. 返回结果
    console.log(`云函数总耗时: ${Date.now() - startTime}ms`)
    return {
      code: 0,
      message: 'success',
      data: {
        poem,
        imageUrl: compressedUrl
      }
    }
  } catch (err) {
    console.error('云函数执行错误:', err)
    console.log(`云函数失败总耗时: ${Date.now() - startTime}ms`)
    return {
      code: -1,
      message: err.message,
      data: null
    }
  }
}