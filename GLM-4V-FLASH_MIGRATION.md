# GLM-4V-Flash 模型迁移说明

## 📋 迁移概述

本次更新已将项目从 `GLM-4V` 切换至 **GLM-4V-Flash** 免费模型。

### 🎯 更新时间
2025-11-24

### ✅ 主要变更

#### 1. API 端点变更
- **旧端点**: `https://api.bigmodel.cn/openai/v1/chat/completions`
- **新端点**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **说明**: OpenAI 兼容入口会 301 重定向至 PaaS v4，因此云函数现在直接调用新端点以避免中断。

#### 2. 模型标识符变更
- **旧模型**: `glm-4v`
- **新模型**: `glm-4v-flash`

#### 3. 请求格式变更

**旧格式** (GLM-4V):
```javascript
{
  model: 'glm-4v',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: 'https://...' }
        },
        {
          type: 'text',
          text: '请根据这张图片的意境创作一首诗'
        }
      ]
    }
  ],
  temperature: 0.8,
  top_p: 0.8
}
```

**新格式** (GLM-4V-Flash):
```javascript
{
  model: 'glm-4v-flash',
  messages: [
    {
      role: 'user',
      content: '请根据这张图片的意境创作一首诗'
    }
  ],
  image_url: 'https://...',  // 图片URL单独传递
  temperature: 0.8,
  max_tokens: 512
}
```

#### 4. 参数调整
- **移除**: `top_p` (使用默认值 0.9)
- **新增**: `max_tokens: 512` (控制输出长度，最大4096)
- **保留**: `temperature: 0.8` (创造性控制)

---

## 🔑 模型特性对比

| 特性 | GLM-4V | GLM-4V-Flash |
|-----|--------|--------------|
| **费用** | 付费 (~0.015元/次) | **免费** |
| **速度** | 标准 | **更快** |
| **API端点** | PaaS v4 | PaaS v4（推荐，OpenAI 入口会重定向） |
| **消息格式** | 复杂（嵌套content） | 简化（文本+URL分离） |
| **限流** | 较宽松 | ~30次/分钟 |
| **图片限制** | 标准 | 单次<8MB, 图片<4MB |
| **适用场景** | 企业生产 | 个人开发/测试 |

---

## 📦 已修改文件

### 1. `cloudfunctions/generatePoem/index.js`
**修改内容**:
- 更新 API 端点为 `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- 模型名改为 `glm-4v-flash`
- 简化 `messages` 格式，移除嵌套的 content 数组
- 新增 `image_url` 参数直接传递图片URL
- 调整参数：移除 `top_p`，新增 `max_tokens: 512`

**变更位置**: 约第58-91行

### 2. `API_CONFIG.md`
**修改内容**:
- 第 1.5 节更新为 GLM-4V-Flash 说明
- 更新 API 端点文档
- 更新请求示例和参数说明
- 新增模型限制说明

---

## 🚀 部署步骤

### 步骤 1: 确认 API Key
GLM-4V-Flash 使用相同的智谱 API Key，无需重新配置。

```bash
# 确认云函数环境变量已配置
ZHIPU_API_KEY = "你的密钥"
```

### 步骤 2: 上传云函数
在微信开发者工具中:
1. 右键 `cloudfunctions/generatePoem` 目录
2. 选择 "上传并部署：云端安装依赖"
3. 等待部署完成

或使用命令行:
```bash
cd cloudfunctions/generatePoem
tcb fn deploy generatePoem
```

### 步骤 3: 测试验证
在云函数测试面板输入:
```json
{
  "fileID": "cloud://你的环境ID.xxxx/test.jpg"
}
```

查看日志确认:
- ✅ 请求URL为 `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- ✅ 模型为 `glm-4v-flash`
- ✅ 成功返回诗歌内容

---

## 🐛 常见问题

### Q1: 出现 400 错误
**可能原因**:
- 图片URL格式不正确
- 图片大小超过4MB

**解决方案**:
- 检查图片URL是否可公网访问
- 确保图片压缩在4MB以内

### Q2: 出现 401 Unauthorized
**可能原因**:
- API Key 未配置或错误

**解决方案**:
```bash
# 重新检查环境变量
云开发控制台 → 云函数 → generatePoem → 配置 → 环境变量
确认 ZHIPU_API_KEY 已正确填入
```

### Q3: 出现 429 Too Many Requests
**可能原因**:
- 超过免费额度限流（~30次/分钟）

**解决方案**:
- 在代码中添加限流控制
- 或升级到付费模型

### Q4: 生成的诗歌质量下降
**可能原因**:
- Flash 模型为轻量级，可能在某些场景下不如标准版

**解决方案**:
- 优化 prompt 提示词
- 调整 `temperature` 参数
- 必要时可回退到 GLM-4V（需付费）

---

## 🔄 如何回退到 GLM-4V

如果需要回退到付费的 GLM-4V 模型:

### 修改 `cloudfunctions/generatePoem/index.js`

```javascript
// 第58行附近，修改 messages
const messages = [
  {
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: tempFileURL }
      },
      {
        type: 'text',
        text: '请根据这张图片的意境创作一首诗'
      }
    ]
  }
]

// 第68行附近，修改请求
const requestConfig = {
  url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  method: 'post',
  data: {
    model: 'glm-4v',  // 改回 glm-4v
    messages,
    temperature: 0.8,
    top_p: 0.8        // 恢复 top_p
  },
  // ...其他配置
}

// 第76行附近，修改实际请求
const response = await axios.post(
  'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  {
    model: 'glm-4v',
    messages,
    temperature: 0.8,
    top_p: 0.8
  },
  // ...其他配置
)
```

---

## 📊 性能监控

### 关键指标

1. **响应时间**: 通过云函数日志查看 `AI调用完成，耗时: XXms`
2. **成功率**: 监控返回 code: 0 的比例
3. **错误率**: 统计 400/401/429 等错误

### 日志示例

成功调用:
```
开始调用智谱AI...
请求配置: {
  "url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  "data": {
    "model": "glm-4v-flash",
    ...
  }
}
AI调用完成，耗时: 1234ms
生成的诗歌: 春风拂柳绿...
```

---

## 💡 优化建议

### 1. 添加环境变量控制模型
在 `index.js` 顶部:
```javascript
const MODEL = process.env.ZHIPU_MODEL || 'glm-4v-flash'
```

这样可以在云函数配置中灵活切换模型，无需修改代码。

### 2. 实现模型降级
```javascript
async function callAI(imageUrl, prompt) {
  try {
    return await callFlashModel(imageUrl, prompt)
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Flash模型限流，降级到标准模型')
      return await callStandardModel(imageUrl, prompt)
    }
    throw error
  }
}
```

### 3. 缓存机制
对相同图片的请求进行缓存，避免重复调用:
```javascript
const cache = new Map()
const cacheKey = crypto.createHash('md5').update(fileID).digest('hex')
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

---

## 📞 获取支持

- **智谱AI文档**: https://docs.bigmodel.cn/cn/guide/models/free/glm-4v-flash
- **API参考**: https://www.bigmodel.cn/api-reference
- **控制台**: https://open.bigmodel.cn/console

---

**迁移完成时间**: 2025-11-24  
**迁移状态**: ✅ 已完成  
**测试状态**: ⏳ 待测试
