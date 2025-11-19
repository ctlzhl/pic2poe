// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 智谱AI API Key (需要在云函数环境变量中配置)
const API_KEY = process.env.ZHIPU_API_KEY || ''

/**
 * 调用智谱AI生成古诗
 * @returns {Promise<{title: string, body: string}>}
 */
async function generatePoemWithAI(imageUrl) {
  if (!API_KEY) {
    throw new Error('请配置智谱AI的API_KEY')
  }

  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4v',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: '请根据这张图片创作一首五言绝句。要求：\n1. 返回格式严格为JSON：{"title":"诗名","body":"第一句\\n第二句\\n第三句\\n第四句"}\n2. 诗名简洁优雅(2-4字)\n3. 正文共4句，每句5字\n4. 符合格律，意境优美\n5. 只返回JSON，不要其他说明'
              }
            ]
          }
        ],
        temperature: 0.8,
        top_p: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const content = response.data.choices[0].message.content.trim()
    console.log('AI返回内容:', content)
    
    // 尝试提取JSON
    let poem
    try {
      // 尝试直接解析
      poem = JSON.parse(content)
    } catch (e) {
      // 尝试提取JSON块
      const jsonMatch = content.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/)
      if (jsonMatch) {
        poem = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI返回格式错误')
      }
    }

    if (!poem.title || !poem.body) {
      throw new Error('AI返回缺少必要字段')
    }

    console.log('解析后的古诗:', poem)
    return poem
  } catch (error) {
    console.error('智谱AI调用失败:', error.response?.data || error.message)
    throw new Error('AI创作失败: ' + (error.response?.data?.error?.message || error.message))
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { fileID } = event

  try {
    console.log('开始处理，图片文件ID:', fileID)

    // 1. 获取图片临时下载链接
    console.log('尝试获取图片临时URL...')
    const fileResult = await cloud.getTempFileURL({
      fileList: [fileID]
    })

    if (!fileResult.fileList || fileResult.fileList.length === 0) {
      console.error('获取图片URL失败，返回结果:', JSON.stringify(fileResult))
      throw new Error('获取图片URL失败')
    }

    const imageUrl = fileResult.fileList[0].tempFileURL
    console.log('图片临时URL获取成功:', imageUrl)

    // 2. 调用AI生成古诗
    const poem = await generatePoemWithAI(imageUrl)

    // 3. 生成压缩后的图片URL（添加imageMogr2参数）
    const compressedUrl = `${imageUrl}?imageMogr2/thumbnail/800x/rquality/80`

    return {
      code: 0,
      success: true,
      poem: poem,  // { title, body }
      originalImageUrl: imageUrl,  // 原图URL
      compressedImageUrl: compressedUrl,  // 压缩后的图片URL
      message: '创作成功'
    }
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      code: -1,
      success: false,
      message: error.message || '创作失败，请重试'
    }
  }
}