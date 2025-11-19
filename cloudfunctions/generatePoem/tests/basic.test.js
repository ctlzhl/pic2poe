// 基础功能测试 - 使用自定义测试运行器
const { Assert, TestSuite, mockAxios, mockCanvas, mockCloud, jest } = require('./simple-test-runner')

// 模拟依赖
global.axios = mockAxios
global.require = function(moduleName) {
  switch(moduleName) {
    case 'axios':
      return mockAxios
    case 'canvas':
      return mockCanvas
    case 'wx-server-sdk':
      return mockCloud
    default:
      return {}
  }
}

// 模拟 process.env
global.process = {
  env: {}
}

// 加载被测试的模块
const generatePoemModule = require('../index.js')

// 创建测试套件
const aiTestSuite = new TestSuite('AI生成古诗功能测试')
const imageTestSuite = new TestSuite('图片合成功能测试')
const mainTestSuite = new TestSuite('云函数主入口测试')

// AI生成古诗测试
aiTestSuite.beforeEach(() => {
  jest.clearAllMocks()
  global.process.env.ZHIPU_API_KEY = 'test-api-key'
})

aiTestSuite.afterEach(() => {
  delete global.process.env.ZHIPU_API_KEY
})

aiTestSuite.test('成功调用AI生成古诗', async () => {
  const imageUrl = 'https://example.com/test-image.jpg'
  const mockPoem = '春江潮水连海平\n海上明月共潮生\n滟滟随波千万里\n何处春江无月明'
  
  mockAxios.post.mockResolvedValue({
    data: {
      choices: [{
        message: {
          content: mockPoem
        }
      }]
    }
  })

  const result = await generatePoemModule.generatePoemWithAI(imageUrl)
  
  Assert.equal(result, mockPoem)
  Assert.isTrue(mockAxios.post.called)
})

aiTestSuite.test('API_KEY未配置时抛出错误', async () => {
  delete global.process.env.ZHIPU_API_KEY
  const imageUrl = 'https://example.com/test-image.jpg'

  await Assert.throws(
    () => generatePoemModule.generatePoemWithAI(imageUrl),
    '请配置智谱AI的API_KEY'
  )
})

aiTestSuite.test('AI API调用失败时抛出错误', async () => {
  const imageUrl = 'https://example.com/test-image.jpg'
  const errorMessage = 'API调用失败'
  
  mockAxios.post.mockRejectedValue({
    response: {
      data: {
        error: {
          message: errorMessage
        }
      }
    }
  })

  await Assert.throws(
    () => generatePoemModule.generatePoemWithAI(imageUrl),
    'AI创作失败'
  )
})

// 图片合成测试
imageTestSuite.beforeEach(() => {
  jest.clearAllMocks()
})

imageTestSuite.test('成功合成图片和古诗', async () => {
  const imageUrl = 'https://example.com/test-image.jpg'
  const poem = '春江潮水连海平\n海上明月共潮生'
  
  const mockImage = {
    width: 800,
    height: 600
  }
  
  mockCanvas.loadImage.mockResolvedValue(mockImage)

  const result = await generatePoemModule.compositeImage(imageUrl, poem)
  
  Assert.isTrue(Buffer.isBuffer(result))
  Assert.isTrue(mockCanvas.loadImage.called)
})

imageTestSuite.test('处理空行诗句', async () => {
  const imageUrl = 'https://example.com/test-image.jpg'
  const poem = '春江潮水连海平\n\n海上明月共潮生'
  
  const mockImage = {
    width: 800,
    height: 600
  }
  
  mockCanvas.loadImage.mockResolvedValue(mockImage)

  const result = await generatePoemModule.compositeImage(imageUrl, poem)
  
  Assert.isTrue(Buffer.isBuffer(result))
})

imageTestSuite.test('图片加载失败时抛出错误', async () => {
  const imageUrl = 'https://example.com/test-image.jpg'
  const poem = '春江潮水连海平'
  
  mockCanvas.loadImage.mockRejectedValue(new Error('图片加载失败'))

  await Assert.throws(
    () => generatePoemModule.compositeImage(imageUrl, poem),
    '图片合成失败'
  )
})

// 云函数主入口测试
mainTestSuite.beforeEach(() => {
  jest.clearAllMocks()
  global.process.env.ZHIPU_API_KEY = 'test-api-key'
})

mainTestSuite.test('完整流程成功执行', async () => {
  const event = { fileID: 'test-file-id' }
  const poem = '春江潮水连海平\n海上明月共潮生'
  
  // Mock getTempFileURL for input image
  mockCloud.getTempFileURL.mockResolvedValueOnce({
    fileList: [{
      tempFileURL: 'https://example.com/temp-image.jpg'
    }]
  })
  
  // Mock AI generation
  mockAxios.post.mockResolvedValue({
    data: {
      choices: [{
        message: {
          content: poem
        }
      }]
    }
  })
  
  // Mock image loading
  mockCanvas.loadImage.mockResolvedValue({
    width: 800,
    height: 600
  })
  
  // Mock uploadFile
  mockCloud.uploadFile.mockResolvedValue({
    fileID: 'result-file-id'
  })
  
  // Mock getTempFileURL for result image
  mockCloud.getTempFileURL.mockResolvedValueOnce({
    fileList: [{
      tempFileURL: 'https://example.com/result-image.jpg'
    }]
  })

  const result = await generatePoemModule.main(event, {})

  Assert.isTrue(result.success)
  Assert.equal(result.poem, poem)
  Assert.equal(result.imageUrl, 'result-file-id')
})

mainTestSuite.test('缺少fileID参数时返回错误', async () => {
  const event = {}

  const result = await generatePoemModule.main(event, {})

  Assert.isFalse(result.success)
  Assert.isTrue(result.message.includes('获取图片URL失败'))
})

mainTestSuite.test('获取图片URL失败时返回错误', async () => {
  const event = { fileID: 'invalid-file-id' }
  
  mockCloud.getTempFileURL.mockResolvedValue({
    fileList: []
  })

  const result = await generatePoemModule.main(event, {})

  Assert.isFalse(result.success)
  Assert.equal(result.message, '获取图片URL失败')
})

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行 generatePoem 云函数测试\n')
  
  const results = []
  
  results.push(await aiTestSuite.run())
  results.push(await imageTestSuite.run())
  results.push(await mainTestSuite.run())
  
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  
  console.log('\n📋 总体测试结果:')
  console.log(`  ✅ 通过: ${totalPassed}`)
  console.log(`  ❌ 失败: ${totalFailed}`)
  console.log(`  📊 成功率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
  
  if (totalFailed === 0) {
    console.log('\n🎉 所有测试通过！')
  } else {
    console.log('\n⚠️  有测试失败，请检查代码')
  }
  
  return totalFailed === 0
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('测试运行失败:', error)
    process.exit(1)
  })
}

module.exports = { runAllTests }