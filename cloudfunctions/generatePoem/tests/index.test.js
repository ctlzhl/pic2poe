const assert = require('assert')
const { extractPoemFromResponse, ensureJsonResponse } = require('../index')

const tests = [
  {
    name: '可解析OpenAI风格的choices字段',
    run: () => {
      const poem = extractPoemFromResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '春风又绿江南岸'
            }
          }
        ]
      })
      assert.strictEqual(poem, '春风又绿江南岸')
    }
  },
  {
    name: '可解析智谱返回的data.choices字段',
    run: () => {
      const poem = extractPoemFromResponse({
        code: 0,
        data: {
          requestId: 'mock-id',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '桃花流水杳然去'
              }
            }
          ]
        }
      })
      assert.strictEqual(poem, '桃花流水杳然去')
    }
  },
  {
    name: '可解析对象形式的content文本',
    run: () => {
      const poem = extractPoemFromResponse({
        choices: [
          {
            message: {
              content: {
                text: '烟笼寒水月笼沙'
              }
            }
          }
        ]
      })
      assert.strictEqual(poem, '烟笼寒水月笼沙')
    }
  },
  {
    name: '可展开数组形式的content',
    run: () => {
      const poem = extractPoemFromResponse({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: '青山一道同云雨' },
                { type: 'text', text: '明月何曾是两乡' }
              ]
            }
          }
        ]
      })
      assert.strictEqual(poem, '青山一道同云雨\n明月何曾是两乡')
    }
  },
  {
    name: '无有效内容时会抛出错误',
    run: () => {
      assert.throws(
        () => extractPoemFromResponse({ code: 0, data: {} }),
        /未找到生成内容/
      )
    }
  },
  {
    name: 'ensureJsonResponse允许JSON对象通过',
    run: () => {
      assert.doesNotThrow(() =>
        ensureJsonResponse({
          headers: { 'content-type': 'application/json' },
          data: { code: 0 }
        })
      )
    }
  },
  {
    name: 'ensureJsonResponse会拦截HTML字符串',
    run: () => {
      assert.throws(
        () =>
          ensureJsonResponse({
            headers: { 'content-type': 'text/html' },
            data: '<html>mock</html>'
          }),
        /响应类型异常/
      )
    }
  }
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    test.run()
    passed += 1
    console.log(`✅ ${test.name}`)
  } catch (error) {
    failed += 1
    console.error(`❌ ${test.name}`)
    console.error(error)
  }
}

console.log(`\n共 ${tests.length} 个用例，已通过 ${passed} 个。`)

if (failed > 0) {
  process.exitCode = 1
}
