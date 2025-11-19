# 🔑 API配置指南

## 一、智谱AI配置（主要方案）

### 1.1 注册账号

1. 访问：https://open.bigmodel.cn/
2. 点击右上角"注册"
3. 使用手机号注册（支持微信登录）
4. 完成实名认证

### 1.2 获取API Key

1. 登录后进入"控制台"
2. 左侧菜单选择"API Keys"
3. 点击"创建新的API密钥"
4. 复制密钥（只显示一次，务必保存！）

### 1.3 充值（可选）

- 新用户有免费额度用于测试
- 正式使用建议充值：最低10元
- 按量计费：
  - GLM-4V：约0.015元/次（视觉模型）
  - GLM-4：约0.01元/次（文本模型）

### 1.4 在云函数中配置

**方法一：云开发控制台配置（推荐）**

```
1. 打开云开发控制台
2. 云函数 → generatePoem → 配置
3. 环境变量 → 添加
   - 变量名：ZHIPU_API_KEY
   - 变量值：你的API Key
4. 保存
```

**方法二：修改config.json**

```json
{
  "permissions": {
    "openapi": [
      "cloudbase.getTempFileURL",
      "cloudbase.uploadFile"
    ]
  },
  "env": {
    "ZHIPU_API_KEY": "填入你的API Key"
  }
}
```

### 1.5 API调用说明

**当前使用模型**：GLM-4V（视觉理解模型）

**API端点**：
```
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

**请求示例**：
```javascript
{
  "model": "glm-4v",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "图片URL"
          }
        },
        {
          "type": "text",
          "text": "请根据这张图片创作一首五言绝句"
        }
      ]
    }
  ],
  "temperature": 0.8
}
```

**参数说明**：
- `temperature`: 0-1，控制创造性（0.8较为合适）
- `top_p`: 0-1，核采样参数（0.8推荐）
- `max_tokens`: 最大生成长度（默认1024）

### 1.6 监控用量

1. 进入智谱AI控制台
2. "数据总览" → 查看调用次数和费用
3. "调用记录" → 查看详细日志

---

## 二、腾讯混元配置（备选方案）

### 2.1 开通服务

1. 访问：https://cloud.tencent.com/product/hunyuan
2. 登录腾讯云账号（需实名认证）
3. 开通"腾讯混元大模型"服务
4. 进入"访问管理" → "API密钥管理"
5. 创建密钥，获取：
   - SecretId
   - SecretKey

### 2.2 价格说明

- 腾讯混元-Lite：0.008元/千tokens
- 腾讯混元-Standard：0.03元/千tokens
- 腾讯混元-Pro：0.12元/千tokens

### 2.3 修改云函数代码

替换 `cloudfunctions/generatePoem/index.js` 中的AI调用部分：

```javascript
const tencentcloud = require("tencentcloud-sdk-nodejs")

// 腾讯云认证
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client
const clientConfig = {
  credential: {
    secretId: process.env.HUNYUAN_SECRET_ID,
    secretKey: process.env.HUNYUAN_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "hunyuan.tencentcloudapi.com",
    },
  },
}

const client = new HunyuanClient(clientConfig)

// 调用混元API
async function generatePoemWithHunyuan(imageUrl) {
  const params = {
    "Model": "hunyuan-vision",
    "Messages": [
      {
        "Role": "user",
        "Content": [
          {
            "Type": "image_url",
            "ImageUrl": {
              "Url": imageUrl
            }
          },
          {
            "Type": "text",
            "Text": "请根据这张图片创作一首五言绝句"
          }
        ]
      }
    ]
  }
  
  const response = await client.ChatCompletions(params)
  return response.Choices[0].Message.Content
}
```

### 2.4 安装依赖

```bash
cd cloudfunctions/generatePoem
npm install tencentcloud-sdk-nodejs --save
```

---

## 三、对比和选择

| 对比项 | 智谱AI (GLM-4V) | 腾讯混元 |
|-------|----------------|---------|
| **注册难度** | ⭐⭐ 简单 | ⭐⭐⭐ 需实名 |
| **配置复杂度** | ⭐⭐ 简单 | ⭐⭐⭐⭐ 复杂 |
| **免费额度** | ✅ 有测试额度 | ❌ 无免费额度 |
| **价格** | 0.015元/次 | 0.008-0.12元/次 |
| **古诗效果** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 良好 |
| **视觉理解** | ⭐⭐⭐⭐⭐ 强 | ⭐⭐⭐⭐ 强 |
| **响应速度** | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐ 快 |
| **文档质量** | ⭐⭐⭐⭐⭐ 详细 | ⭐⭐⭐⭐ 详细 |

**推荐**：
- 🥇 **个人开发/测试**：智谱AI（有免费额度，配置简单）
- 🥈 **企业应用**：腾讯混元（稳定性高，服务保障）

---

## 四、API调用优化

### 4.1 提示词优化

**基础版**（当前）：
```
请根据这张图片创作一首五言绝句(4句，每句5字)。
要求：1.符合格律 2.意境优美 3.文字优雅 4.只返回诗句
```

**进阶版**：
```
你是一位资深的中国古典诗词创作大师。
请仔细观察这张图片，捕捉其中的意境、色彩、情感和氛围。
根据图片内容创作一首五言绝句，要求：
1. 严格遵循五言绝句格律（4句，每句5字，押韵）
2. 意境优美，富有诗意
3. 用词典雅，避免现代词汇
4. 直接返回诗句，不要解释和说明
```

**特定主题**：
```
// 风景照
请以山水为主题，创作一首五言绝句

// 人物照
请以人物神态为主题，创作一首五言绝句

// 城市照
请以繁华都市为主题，创作一首五言绝句
```

### 4.2 温度参数调整

```javascript
// temperature控制创造性
{
  temperature: 0.5  // 保守，格律严谨
  temperature: 0.8  // 平衡（推荐）
  temperature: 1.0  // 创新，可能不太符合格律
}
```

### 4.3 错误处理

```javascript
async function generatePoemWithRetry(imageUrl, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const poem = await generatePoemWithAI(imageUrl)
      
      // 验证诗句格式
      const lines = poem.split('\n').filter(line => line.trim())
      if (lines.length === 4 && lines.every(line => line.length === 5)) {
        return poem
      }
      
      console.log(`第${i+1}次生成格式不符，重试...`)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000) // 等待1秒后重试
    }
  }
}
```

### 4.4 成本控制

```javascript
// 添加调用次数限制
const MAX_CALLS_PER_USER = 10 // 每用户每天10次

// 缓存结果，避免重复调用
const resultCache = new Map()

function getCacheKey(imageHash) {
  return `poem_${imageHash}`
}
```

---

## 五、测试API连接

### 5.1 使用云函数测试

在云开发控制台 → 云函数 → generatePoem → 测试：

```json
{
  "fileID": "cloud://your-env.xxx/test.jpg"
}
```

### 5.2 本地测试脚本

创建 `test-api.js`：

```javascript
const axios = require('axios')

const API_KEY = '你的API Key'

async function testAPI() {
  try {
    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: 'glm-4',
        messages: [
          {
            role: 'user',
            content: '创作一首五言绝句，主题：春天'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('✅ API连接成功')
    console.log('生成结果：', response.data.choices[0].message.content)
  } catch (error) {
    console.error('❌ API连接失败:', error.message)
  }
}

testAPI()
```

运行测试：
```bash
node test-api.js
```

---

## 六、常见API错误

### 错误1：401 Unauthorized

**原因**：API Key无效或未配置

**解决**：
```bash
# 检查API Key是否正确
# 确认环境变量是否配置
# 重新生成API Key
```

### 错误2：429 Too Many Requests

**原因**：调用频率过高

**解决**：
```javascript
// 添加请求限流
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
await delay(1000) // 每次调用间隔1秒
```

### 错误3：500 Internal Server Error

**原因**：服务端错误

**解决**：
```javascript
// 添加重试机制
// 检查请求参数是否正确
// 查看API服务状态
```

### 错误4：Insufficient Balance

**原因**：账户余额不足

**解决**：
```bash
# 登录智谱AI控制台充值
# 最低充值10元
```

---

## 七、监控和日志

### 7.1 云函数日志

```javascript
// 在关键位置添加日志
console.log('开始调用AI，图片URL:', imageUrl)
console.log('AI返回结果:', poem)
console.log('图片合成完成，大小:', buffer.length)
```

### 7.2 API调用统计

在智谱AI控制台查看：
- 每日调用次数
- 成功率
- 平均响应时间
- 费用统计

---

**配置完成后，记得测试一下整个流程！** ✅
