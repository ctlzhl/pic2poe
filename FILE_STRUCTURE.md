# 📁 项目文件结构说明

## 目录树

```
pic2poe/
│
├── 📱 小程序页面
│   ├── pages/
│   │   ├── index/                    # 📸 首页 - 图片上传
│   │   │   ├── index.js             # 页面逻辑：图片选择、上传、调用云函数
│   │   │   ├── index.wxml           # 页面结构：UI布局
│   │   │   ├── index.wxss           # 页面样式：中国风设计
│   │   │   └── index.json           # 页面配置
│   │   │
│   │   └── result/                   # ✨ 结果页 - 展示合成图
│   │       ├── result.js            # 页面逻辑：保存、分享功能
│   │       ├── result.wxml          # 页面结构：图片展示
│   │       ├── result.wxss          # 页面样式：优雅排版
│   │       └── result.json          # 页面配置：分享设置
│
├── ☁️ 云函数
│   └── cloudfunctions/
│       └── generatePoem/             # 🎨 核心云函数
│           ├── index.js             # 主要逻辑：
│           │                        #   - 调用智谱AI生成古诗
│           │                        #   - Canvas图片合成
│           │                        #   - 云存储上传
│           ├── package.json         # 依赖配置：
│           │                        #   - wx-server-sdk
│           │                        #   - axios
│           │                        #   - canvas
│           └── config.json          # 环境变量：ZHIPU_API_KEY
│
├── 🧩 组件（可选）
│   └── components/
│       └── navigation-bar/          # 自定义导航栏（原有组件）
│           ├── navigation-bar.js
│           ├── navigation-bar.json
│           ├── navigation-bar.wxml
│           └── navigation-bar.wxss
│
├── 🎨 全局文件
│   ├── app.js                       # 小程序入口：云开发初始化
│   ├── app.json                     # 全局配置：页面路由、窗口样式
│   ├── app.wxss                     # 全局样式：通用样式定义
│   ├── sitemap.json                 # 站点地图：SEO配置
│   ├── project.config.json          # 项目配置：AppID、编译设置
│   └── project.private.config.json  # 私有配置：个人设置
│
├── 📚 文档
│   ├── README.md                    # 📖 项目说明文档
│   ├── QUICK_START.md              # ⚡ 快速启动指南（5分钟上手）
│   ├── DEPLOY.md                   # 🚀 详细部署教程
│   ├── API_CONFIG.md               # 🔑 API配置指南
│   ├── PROJECT_SUMMARY.md          # 📊 项目总结
│   ├── FILE_STRUCTURE.md           # 📁 本文件
│   └── .env.example                # 🔧 环境变量示例
│
└── 🔧 配置文件
    └── .eslintrc.js                # ESLint配置
```

---

## 核心文件说明

### 🎯 必须修改的文件

#### 1. `app.js` - 配置云开发环境ID
```javascript
// 第10行
env: 'your-env-id',  // 👈 改成你的云开发环境ID
```

#### 2. `cloudfunctions/generatePoem/config.json` - 配置API Key
```json
{
  "env": {
    "ZHIPU_API_KEY": ""  // 👈 填入智谱AI的API Key
  }
}
```

---

## 📄 文件详细说明

### 前端页面文件

| 文件 | 行数 | 功能 | 关键代码 |
|------|-----|------|---------|
| `pages/index/index.js` | ~120 | 图片选择和上传 | `chooseImage()`, `generatePoem()` |
| `pages/index/index.wxml` | ~50 | 首页UI结构 | 图片预览、按钮、示例 |
| `pages/index/index.wxss` | ~180 | 中国风样式 | 渐变色、卡片、按钮 |
| `pages/result/result.js` | ~80 | 保存和分享 | `saveImage()`, `onShareAppMessage()` |
| `pages/result/result.wxml` | ~40 | 结果页UI | 图片展示、操作按钮 |
| `pages/result/result.wxss` | ~150 | 结果页样式 | 图片容器、诗词显示 |

### 云函数文件

| 文件 | 行数 | 功能 | 关键代码 |
|------|-----|------|---------|
| `cloudfunctions/generatePoem/index.js` | ~180 | AI调用和图片合成 | `generatePoemWithAI()`, `compositeImage()` |
| `cloudfunctions/generatePoem/package.json` | ~12 | 依赖管理 | canvas, axios, wx-server-sdk |
| `cloudfunctions/generatePoem/config.json` | ~15 | 环境配置 | API Key, 权限设置 |

### 配置文件

| 文件 | 功能 | 重要性 |
|------|-----|--------|
| `app.json` | 页面路由、全局配置 | ⭐⭐⭐⭐⭐ |
| `app.js` | 云开发初始化 | ⭐⭐⭐⭐⭐ |
| `project.config.json` | AppID、编译设置 | ⭐⭐⭐⭐ |

### 文档文件

| 文件 | 用途 | 阅读时间 |
|------|-----|---------|
| `QUICK_START.md` | 快速上手（零基础） | 5分钟 |
| `DEPLOY.md` | 完整部署教程 | 30分钟 |
| `API_CONFIG.md` | API配置详解 | 15分钟 |
| `README.md` | 项目全面介绍 | 20分钟 |
| `PROJECT_SUMMARY.md` | 项目总结报告 | 10分钟 |

---

## 🔄 文件依赖关系

### 页面调用关系
```
index.js (首页)
    ↓ 调用
wx.cloud.uploadFile (上传图片)
    ↓ 调用
wx.cloud.callFunction (调用云函数)
    ↓ 调用
generatePoem 云函数
    ├─→ 智谱AI API
    └─→ Canvas图片合成
    ↓ 返回
result.js (结果页)
    ├─→ saveImage (保存)
    └─→ onShareAppMessage (分享)
```

### 样式继承关系
```
app.wxss (全局样式)
    ├─→ index.wxss (首页样式)
    └─→ result.wxss (结果页样式)
```

---

## 📦 依赖包说明

### 云函数依赖 (`cloudfunctions/generatePoem/package.json`)

```json
{
  "dependencies": {
    "wx-server-sdk": "~2.6.3",     // 微信云开发SDK
    "axios": "^1.6.0",              // HTTP请求库（调用AI API）
    "canvas": "^2.11.2"             // Node.js图片处理库
  }
}
```

**安装方法**：
```bash
cd cloudfunctions/generatePoem
npm install
```

---

## 🎨 代码统计

### 代码量统计

| 类型 | 文件数 | 总行数 | 说明 |
|------|-------|--------|------|
| JavaScript | 5 | ~500行 | 业务逻辑 |
| WXML | 2 | ~90行 | 页面结构 |
| WXSS | 3 | ~350行 | 样式代码 |
| 云函数 | 1 | ~180行 | 核心逻辑 |
| 文档 | 6 | ~1500行 | 说明文档 |
| **合计** | **17** | **~2620行** | **总代码量** |

### 核心代码占比

```
业务逻辑：  35%  (JavaScript)
样式设计：  25%  (WXSS)
云函数：    20%  (generatePoem)
页面结构：  10%  (WXML)
文档：      10%  (Markdown)
```

---

## 🔍 快速定位

### 需要修改某个功能？找这里：

| 功能 | 文件位置 |
|------|---------|
| 修改UI颜色主题 | `app.json`, `*.wxss` |
| 调整AI提示词 | `cloudfunctions/generatePoem/index.js` 第30行 |
| 修改图片合成样式 | `cloudfunctions/generatePoem/index.js` 第80行 |
| 添加新页面 | `pages/` 新建文件夹 + `app.json` 添加路由 |
| 修改按钮样式 | `pages/*/index.wxss` 搜索 `.btn-` |
| 修改导航栏颜色 | `app.json` → `window` → `navigationBarBackgroundColor` |
| 添加历史记录 | 新建页面 + 云数据库存储 |

---

## 📝 文件修改记录

### 从模板到完整项目的变化

| 原文件 | 状态 | 修改内容 |
|-------|------|---------|
| `pages/index/index.js` | ✏️ 重写 | 添加图片上传和云函数调用 |
| `pages/index/index.wxml` | ✏️ 重写 | 全新的中国风UI |
| `pages/index/index.wxss` | ✏️ 重写 | 渐变色、卡片样式 |
| `pages/result/` | ➕ 新建 | 完整的结果展示页 |
| `cloudfunctions/generatePoem/` | ➕ 新建 | 核心业务逻辑 |
| `app.js` | ✏️ 修改 | 添加云开发初始化 |
| `app.json` | ✏️ 修改 | 更新配置和路由 |
| `app.wxss` | ✏️ 修改 | 添加全局样式 |
| 文档文件 | ➕ 新建 | 6个详细文档 |

---

## 🚀 下一步开发建议

### 扩展功能时可以新建的文件

```
pages/
├── history/              # 历史记录页
│   ├── history.js
│   ├── history.wxml
│   ├── history.wxss
│   └── history.json
│
├── settings/             # 设置页
│   ├── settings.js
│   ├── settings.wxml
│   └── ...
│
└── gallery/              # 作品画廊
    └── ...

cloudfunctions/
├── saveHistory/          # 保存历史记录
├── getHistory/           # 获取历史记录
└── analyzeImage/         # 图片分析（可选）

utils/
├── util.js               # 工具函数
├── request.js            # 请求封装
└── constants.js          # 常量定义
```

---

## 💡 文件命名规范

### 页面文件
- 文件夹名：小写，使用连字符（如：`user-profile`）
- JS文件：与文件夹同名
- 样式文件：与页面对应

### 云函数
- 文件夹名：驼峰命名（如：`generatePoem`）
- 入口文件：统一使用 `index.js`

### 文档文件
- 大写字母 + 下划线（如：`README.md`, `QUICK_START.md`）
- 全部使用 `.md` 格式

---

**文件结构清晰，便于维护和扩展！** 📁✨
