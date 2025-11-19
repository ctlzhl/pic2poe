// 简单的测试运行器，不依赖 Jest
const fs = require('fs')
const path = require('path')

// 简单的断言库
class Assert {
  static equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`断言失败: ${message}\n  期望: ${expected}\n  实际: ${actual}`)
    }
  }

  static deepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`断言失败: ${message}\n  期望: ${JSON.stringify(expected)}\n  实际: ${JSON.stringify(actual)}`)
    }
  }

  static throws(asyncFn, expectedMessage, message = '') {
    return asyncFn().then(() => {
      throw new Error(`断言失败: ${message}\n  期望抛出异常，但没有抛出`)
    }).catch(error => {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`断言失败: ${message}\n  期望错误信息包含: ${expectedMessage}\n  实际错误信息: ${error.message}`)
      }
    })
  }

  static isTrue(value, message = '') {
    if (!value) {
      throw new Error(`断言失败: ${message}\n  期望: true\n  实际: ${value}`)
    }
  }

  static isFalse(value, message = '') {
    if (value) {
      throw new Error(`断言失败: ${message}\n  期望: false\n  实际: ${value}`)
    }
  }
}

// 测试套件
class TestSuite {
  constructor(name) {
    this.name = name
    this.tests = []
    this.beforeEachCallbacks = []
    this.afterEachCallbacks = []
  }

  test(description, testFn) {
    this.tests.push({ description, testFn })
  }

  beforeEach(callback) {
    this.beforeEachCallbacks.push(callback)
  }

  afterEach(callback) {
    this.afterEachCallbacks.push(callback)
  }

  async run() {
    console.log(`\n🧪 运行测试套件: ${this.name}`)
    let passed = 0
    let failed = 0

    for (const { description, testFn } of this.tests) {
      try {
        // 执行 beforeEach 回调
        for (const callback of this.beforeEachCallbacks) {
          await callback()
        }

        // 执行测试
        await testFn()
        console.log(`  ✅ ${description}`)
        passed++

        // 执行 afterEach 回调
        for (const callback of this.afterEachCallbacks) {
          await callback()
        }
      } catch (error) {
        console.log(`  ❌ ${description}`)
        console.log(`     错误: ${error.message}`)
        failed++
      }
    }

    console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`)
    return { passed, failed }
  }
}

// Mock 对象
const mockAxios = {
  post: jest.fn()
}

const mockCanvas = {
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
}

const mockCloud = {
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
}

// 简单的 jest mock 实现
function jest() {
  return {
    fn: () => {
      const mockFn = (...args) => {
        mockFn.calls.push(args)
        return mockFn.mockReturnValue
      }
      mockFn.calls = []
      mockFn.mockReturnValue = undefined
      mockFn.mockResolvedValue = (value) => {
        mockFn.mockReturnValue = Promise.resolve(value)
        return mockFn
      }
      mockFn.mockRejectedValue = (value) => {
        mockFn.mockReturnValue = Promise.reject(value)
        return mockFn
      }
      mockFn.mockImplementation = (impl) => {
        mockFn.mockReturnValue = impl
        return mockFn
      }
      return mockFn
    },
    clearAllMocks: () => {
      // 清理所有 mock
    }
  }
}

// 导出测试工具
module.exports = {
  Assert,
  TestSuite,
  mockAxios,
  mockCanvas,
  mockCloud,
  jest
}