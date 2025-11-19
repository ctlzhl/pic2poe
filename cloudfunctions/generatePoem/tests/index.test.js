// generatePoem 云函数单元测试
const { generatePoemWithAI, compositeImage } = require('../index.js')
const axios = require('axios')
const { createCanvas, loadImage } = require('canvas')

// Mock wx-server-sdk
jest.mock('wx-server-sdk', () => ({
  init: jest.fn(),
  database: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(() => ({ data: [] }))
      }))
    }))
  })),
  getTempFileURL: jest.fn(),
  uploadFile: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test-env'
}))

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock canvas
jest.mock('canvas', () => ({
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      font: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: ''
    })),
    toBuffer: jest.fn(() => Buffer.from('mock-image-data'))
  })),
  loadImage: jest.fn(),
  registerFont: jest.fn()
}))

const mockedImageLoad = require('canvas').loadImage

describe('generatePoem 云函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 设置环境变量
    process.env.ZHIPU_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.ZHIPU_API_KEY
  })

  describe('generatePoemWithAI 函数测试', () => {
    test('成功调用AI生成古诗', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const mockPoem = '春江潮水连海平\n海上明月共潮生\n滟滟随波千万里\n何处春江无月明'
      
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: mockPoem
            }
          }]
        }
      })

      // Act
      const result = await generatePoemWithAI(imageUrl)

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        expect.objectContaining({
          model: 'glm-4v',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }),
                expect.objectContaining({
                  type: 'text',
                  text: '请根据这张图片创作一首五言绝句(4句，每句5字)。要求：1.符合格律 2.意境优美 3.文字优雅 4.只返回诗句，不要其他说明'
                })
              ])
            })
          ]),
          temperature: 0.8,
          top_p: 0.8
        }),
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        }
      )
      expect(result).toBe(mockPoem)
    })

    test('API_KEY未配置时抛出错误', async () => {
      // Arrange
      delete process.env.ZHIPU_API_KEY
      const imageUrl = 'https://example.com/test-image.jpg'

      // Act & Assert
      await expect(generatePoemWithAI(imageUrl)).rejects.toThrow('请配置智谱AI的API_KEY')
    })

    test('AI API调用失败时抛出错误', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const errorMessage = 'API调用失败'
      
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage
            }
          }
        }
      })

      // Act & Assert
      await expect(generatePoemWithAI(imageUrl)).rejects.toThrow(`AI创作失败: ${errorMessage}`)
    })

    test('网络错误时抛出错误', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const networkError = new Error('Network Error')
      
      mockedAxios.post.mockRejectedValue(networkError)

      // Act & Assert
      await expect(generatePoemWithAI(imageUrl)).rejects.toThrow('AI创作失败: Network Error')
    })

    test('AI返回内容包含多余空格时正确处理', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const mockPoem = '  春江潮水连海平  \n  海上明月共潮生  \n  滟滟随波千万里  \n  何处春江无月明  '
      
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: mockPoem
            }
          }]
        }
      })

      // Act
      const result = await generatePoemWithAI(imageUrl)

      // Assert
      expect(result).toBe(mockPoem.trim())
    })
  })

  describe('compositeImage 函数测试', () => {
    test('成功合成图片和古诗', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平\n海上明月共潮生\n滟滟随波千万里\n何处春江无月明'
      
      const mockImage = {
        width: 800,
        height: 600
      }
      
      mockedImageLoad.mockResolvedValue(mockImage)

      // Act
      const result = await compositeImage(imageUrl, poem)

      // Assert
      expect(mockedImageLoad).toHaveBeenCalledWith(imageUrl)
      expect(result).toBeInstanceOf(Buffer)
    })

    test('处理空行诗句', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平\n\n海上明月共潮生\n\n滟滟随波千万里\n\n何处春江无月明'
      
      const mockImage = {
        width: 800,
        height: 600
      }
      
      mockedImageLoad.mockResolvedValue(mockImage)

      // Act
      const result = await compositeImage(imageUrl, poem)

      // Assert
      expect(mockedImageLoad).toHaveBeenCalledWith(imageUrl)
      expect(result).toBeInstanceOf(Buffer)
    })

    test('处理单句古诗', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平'
      
      const mockImage = {
        width: 800,
        height: 600
      }
      
      mockedImageLoad.mockResolvedValue(mockImage)

      // Act
      const result = await compositeImage(imageUrl, poem)

      // Assert
      expect(mockedImageLoad).toHaveBeenCalledWith(imageUrl)
      expect(result).toBeInstanceOf(Buffer)
    })

    test('处理不同尺寸的图片', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平\n海上明月共潮生'
      
      // 测试小尺寸图片
      const mockSmallImage = {
        width: 200,
        height: 150
      }
      
      mockedImageLoad.mockResolvedValue(mockSmallImage)

      // Act
      const result = await compositeImage(imageUrl, poem)

      // Assert
      expect(mockedImageLoad).toHaveBeenCalledWith(imageUrl)
      expect(result).toBeInstanceOf(Buffer)
    })

    test('图片加载失败时抛出错误', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平'
      
      mockedImageLoad.mockRejectedValue(new Error('图片加载失败'))

      // Act & Assert
      await expect(compositeImage(imageUrl, poem)).rejects.toThrow('图片合成失败: 图片加载失败')
    })

    test('Canvas操作失败时抛出错误', async () => {
      // Arrange
      const imageUrl = 'https://example.com/test-image.jpg'
      const poem = '春江潮水连海平'
      
      const mockImage = {
        width: 800,
        height: 600
      }
      
      mockedImageLoad.mockResolvedValue(mockImage)
      
      const { createCanvas } = require('canvas')
      createCanvas.mockImplementation(() => {
        throw new Error('Canvas创建失败')
      })

      // Act & Assert
      await expect(compositeImage(imageUrl, poem)).rejects.toThrow('图片合成失败: Canvas创建失败')
    })
  })

  describe('云函数主入口测试', () => {
    let cloud
    
    beforeEach(() => {
      cloud = require('wx-server-sdk')
    })

    test('完整流程成功执行', async () => {
      // Arrange
      const event = { fileID: 'test-file-id' }
      const poem = '春江潮水连海平\n海上明月共潮生\n滟滟随波千万里\n何处春江无月明'
      
      // Mock getTempFileURL for input image
      cloud.getTempFileURL.mockResolvedValueOnce({
        fileList: [{
          tempFileURL: 'https://example.com/temp-image.jpg'
        }]
      })
      
      // Mock AI generation
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: poem
            }
          }]
        }
      })
      
      // Mock image loading
      mockedImageLoad.mockResolvedValue({
        width: 800,
        height: 600
      })
      
      // Mock uploadFile
      cloud.uploadFile.mockResolvedValue({
        fileID: 'result-file-id'
      })
      
      // Mock getTempFileURL for result image
      cloud.getTempFileURL.mockResolvedValueOnce({
        fileList: [{
          tempFileURL: 'https://example.com/result-image.jpg'
        }]
      })

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result).toEqual({
        success: true,
        imageUrl: 'result-file-id',
        poem: poem,
        tempUrl: 'https://example.com/result-image.jpg',
        message: '创作成功'
      })
    })

    test('缺少fileID参数时返回错误', async () => {
      // Arrange
      const event = {}

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('获取图片URL失败')
    })

    test('获取图片URL失败时返回错误', async () => {
      // Arrange
      const event = { fileID: 'invalid-file-id' }
      
      cloud.getTempFileURL.mockResolvedValue({
        fileList: []
      })

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toBe('获取图片URL失败')
    })

    test('AI生成失败时返回错误', async () => {
      // Arrange
      const event = { fileID: 'test-file-id' }
      
      cloud.getTempFileURL.mockResolvedValue({
        fileList: [{
          tempFileURL: 'https://example.com/temp-image.jpg'
        }]
      })
      
      mockedAxios.post.mockRejectedValue(new Error('AI服务不可用'))

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('AI创作失败')
    })

    test('图片合成失败时返回错误', async () => {
      // Arrange
      const event = { fileID: 'test-file-id' }
      
      cloud.getTempFileURL.mockResolvedValue({
        fileList: [{
          tempFileURL: 'https://example.com/temp-image.jpg'
        }]
      })
      
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: '春江潮水连海平'
            }
          }]
        }
      })
      
      mockedImageLoad.mockRejectedValue(new Error('图片合成失败'))

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('图片合成失败')
    })

    test('上传文件失败时返回错误', async () => {
      // Arrange
      const event = { fileID: 'test-file-id' }
      const poem = '春江潮水连海平'
      
      cloud.getTempFileURL.mockResolvedValue({
        fileList: [{
          tempFileURL: 'https://example.com/temp-image.jpg'
        }]
      })
      
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: poem
            }
          }]
        }
      })
      
      mockedImageLoad.mockResolvedValue({
        width: 800,
        height: 600
      })
      
      cloud.uploadFile.mockRejectedValue(new Error('上传失败'))

      // Act
      const result = await require('../index.js').main(event, {})

      // Assert
      expect(result.success).toBe(false)
      expect(result.message).toContain('上传失败')
    })
  })
})