# 照片有话说：纯 CloudBase 云函数 MVP 实施计划

## 目标与边界

本 MVP 交付登录后的“上传照片 → 三类生成 → 类型化结果 → 分享创作”闭环，并保留最小作品历史。首版接受 JPG、PNG、WebP；复用现有上海 CloudBase 个人版环境、文档型数据库和 COS；不启用云托管，不新购 MySQL、Redis 或 BullMQ。

本期不做博客 WordPress 网关、完整设置与隐私管理页、作品筛选、付费、反馈系统或运营后台。现有 `poemRecords` 不迁移、不复用；新版数据从零开始。

## 架构

```text
微信小程序
  ├─ wx.cloud.uploadFile → 私有云存储
  └─ wx.cloud.callFunction
       ├─ prepareImage
       ├─ createImageUpload
       ├─ createCreation
       ├─ runCreation
       ├─ getCreation
       ├─ retryCreation
       ├─ getWork / listWorks / deleteWork
       └─ createShareCard

CloudBase 文档型数据库
  └─ creationTasks 状态变化 → runCreation 云函数

runCreation
  ├─ Qwen：照片理解、图片点评、配图文案
  ├─ GLM：五言绝句
  ├─ 结构与安全校验
  └─ 写入作品和任务结果

定时云函数
  ├─ recoverStuckTasks
  └─ cleanupExpiredAssets
```

小程序不直接读取或写入新版业务集合。所有函数从 `wxContext.OPENID` 取得用户身份，服务端只读取和修改该用户的数据；不为 MVP 单独签发业务 access token。

## 数据与文件契约

### 集合

| 集合 | 关键字段 | 用途 |
| --- | --- | --- |
| `users` | `_id`, `openid`, `createdAt` | 用户在首次创作时创建 |
| `imageAssets` | `userId`, `originalFileId`, `creationFileId`, `thumbnailFileId`, `status`, `expiresAt` | 上传与派生图片资产 |
| `creationDrafts` | `userId`, `imageAssetId`, `generateType`, `location`, `moment`, `mood` | 可重试的创作意图 |
| `creationTasks` | `draftId`, `userId`, `status`, `idempotencyKey`, `attemptId`, `deadlineAt`, `errorCode` | 小程序轮询的任务状态 |
| `creationAttempts` | `draftId`, `taskId`, `number`, `photoUnderstanding`, `modelMeta`, `status` | 每次模型执行与诊断信息 |
| `works` | `userId`, `draftId`, `type`, `content`, `imageAssetId`, `createdAt` | 成功后不可变的历史作品 |
| `shareCards` | `workId`, `shareToken`, `type`, `content`, `creationFileId`, `template`, `templateVersion`, `fileId`, `contentHash` | 私有管理的分享成品图与公开作品快照；公开读取只能通过分享凭证 |

新增集合一律配置为客户端不可直接读写；函数以内置身份校验控制归属。`poemRecords` 当前为所有用户可读，不能存放新版任何私有内容。

### 存储前缀与生命周期

```text
original/{openid}/{assetId}            原图，应用在 24 小时后删除
users/{openid}/creation/{assetId}     标准创作图，成功作品保留
users/{openid}/thumbnail/{assetId}    缩略图，成功作品保留
users/{openid}/share/{workId}/...     分享成品图，随作品删除
```

`cleanupExpiredAssets` 每 15 分钟清理超过 24 小时的原图和失败草稿资产；COS 生命周期规则再以 2 天删除 `original/` 前缀作为兜底。任何删除作品的操作同时删除关联 `creation/`、`thumbnail/` 和 `share/` 文件，并写入可重试的删除队列记录。

## 云函数设计

| 函数 | 触发方式 | 责任 |
| --- | --- | --- |
| `prepareImage` | 小程序调用 | 仅接受 JPG、PNG、WebP，验证大小和真实可读性；修正方向、转 sRGB、清除元数据，生成标准创作图和缩略图 |
| `createImageUpload` | 小程序调用 | 为当前用户创建一次性图片资产和私有暂存路径；`prepareImage` 只接受该资产对应路径的文件 ID |
| `createCreation` | 小程序调用 | 验证图片资产，创建草稿与带 `idempotencyKey` 的任务；同一用户拒绝并行任务 |
| `runCreation` | 小程序 Loading 页调用 + 每分钟定时兜底 | 原子领取 `queued` 任务，执行理解、生成、校验与持久化；重复调用只返回已领取状态 |
| `getCreation` | 小程序调用 | 仅返回当前用户任务的安全状态与成功结果 |
| `retryCreation` | 小程序调用 | 仅失败任务可创建新尝试，复用草稿和已完成照片理解 |
| `getWork` / `listWorks` / `deleteWork` | 小程序调用 | 提供作品详情、最近作品和不可恢复删除 |
| `createShareCard` / `getSharedWork` | 小程序调用 | 前者按作品和模板版本生成或复用 4:5 分享图、小程序码和分享凭证；后者只按分享凭证返回公开作品快照 |
| `recoverStuckTasks` | 每分钟定时触发 | 回收未领取任务、标记超过 60 秒的任务失败，避免迟到结果覆盖失败 |
| `cleanupExpiredAssets` | 每 15 分钟定时触发 | 清理过期原图和失败资产，重试短暂失败的删除 |

所有函数使用 Node.js 20。模型密钥、模型 ID、Prompt 版本、模型超时和温度只配置在函数环境变量中；禁止存入小程序、数据库日志或 Git。

## 创作任务状态机

```text
queued → analyzing → generating → validating → succeeded
  └────────────────────────────────────────→ failed
failed → queued（仅 retryCreation 创建新 attempt）
```

`runCreation` 通过事务或条件更新将任务从 `queued` 领取为 `analyzing`，领取失败即退出。每阶段检查 `deadlineAt`，总耗时达到 60 秒时原子更新为 `failed`；模型结果写回前再次检查任务仍未失败。客户端每 2 秒调用 `getCreation`，第 10 秒仅提示一次“正在努力创作中”。

## 内容生成与安全

1. Qwen 先输出结构化照片理解：画面、主体、动作、情绪、视觉焦点及用户选填上下文。
2. 五言绝句将照片理解交给 GLM；图片点评和配图文案由 Qwen 生成。
3. 每类输出必须为 JSON：诗歌四句、点评标题/正文/观察标签、文案标签/标题/正文/话题。
4. 程序校验诗歌四句且每句五个汉字；不合格最多定向修正一次。
5. Prompt 约束与输出审核共同执行安全、忠于画面、隐私及未成年人保护规则。拒绝时不创建作品，不向客户端返回模型原始理由。

每次尝试记录模型供应商、模型名、Prompt 版本、Token 用量、阶段耗时、重试次数、安全结果和错误码；不记录临时签名 URL、原图字节或模型敏感原文。

## 小程序页面与交互

| 页面 | MVP 行为 |
| --- | --- |
| 首页 | 上传入口、三类能力预选；浏览不强制登录 |
| 创作页 | 未选图仅上传与引导；已选图展示类型、地点、瞬间、感觉与开始生成 |
| 正在创作页 | 真实任务状态、10 秒提示、失败重试与返回创作页 |
| 诗歌结果页 | 原图、诗笺、重写一首、换图重写、分享创作 |
| 点评结果页 | 原图、观点标题、正文、观察标签、换个角度、分享创作 |
| 文案结果页 | 原图、标签、完整文案、话题、换一条、分享创作 |
| 分享页 | 保存图片、发给好友、分享到朋友圈；不编辑正文、不再调用内容模型 |
| 我的 / 作品详情 | 最近 8 张作品、查看作品详情、分享或删除 |

删除现有“生成成功后自动清空选择”和 `app.globalData` 作为创作结果唯一来源的实现；页面路由只传 `taskId`、`workId` 或预选类型。

## 分享图

服务端以 Sharp + SVG 固定模板生成高清 4:5 图，不再依赖小程序 Canvas 截屏：

- 五言绝句：横图上诗下图；竖图或方图左图右诗。
- 图片点评：上图下方米白摄影刊物式文字区，摘要不超过 60 字。
- 配图文案：上图下方米白随笔卡，标题取首句，摘要不超过 104 字。

所有模板保留二维码安全位且无水印；`createShareCard` 通过小程序服务端 API 生成携带作品参数的小程序码。模板版本升级或文件缺失时，以作品的标准创作图和结构化内容补生成。

## 实施阶段与验收

### P0：技术验证与安全基线

- 已完成 CloudBase Node.js 20.19.3 + Sharp 0.33.5 Linux x64 实测：真实 JPG、PNG、WebP 可解码、转为 JPEG 并写回云存储；损坏文件被安全拒绝。
- HEIC 实测失败，原因是运行包缺少对应压缩格式的解码插件；首版明确拒绝 HEIC，并提示用户选择 JPG、PNG 或 WebP。后续若要支持 HEIC，单独评估带 HEIC 解码能力的转码服务或原生依赖构建，不阻塞 MVP。
- 多帧 WebP 保留为上线前补测项；首版对无法处理的文件返回规格中的提示。
- 创建私有存储前缀、COS 生命周期兜底规则和新版私有集合。
- 验收：JPG、PNG、WebP 可派生；HEIC、损坏和其他不支持文件返回规格中的提示；客户端不能直接读取他人新版数据。

### P1：图片与任务骨架

- 实现 `prepareImage`、`createCreation`、`getCreation`、任务状态机、数据库事件派发与恢复定时器。
- 改造创作页、Loading 页及图片上传校验。
- 验收：重复点击不创建重复任务；真实状态驱动 Loading；60 秒后稳定失败且可重试。

### P2：三类内容与结果页

- 实现统一照片理解、三类 Prompt、结构校验、安全拒绝和三套结果页。
- 验收：三种类型无二次类型选择；诗歌结构正确；失败/拒绝不进入作品列表。

### P3：分享与作品历史

- 实现三种服务端分享图、保存相册/好友/朋友圈、小程序码、最近 8 张作品、详情和删除。
- 验收：分享图无水印、不粗暴裁切、可保存；历史作品不可重写；删除后文件与数据均进入清理流程。

### P4：上线前检查

- 覆盖弱网、超时、模型异常、权限拒绝、迟到结果、删除失败重试及成本日志。
- 配置每日调用量和余额告警，记录模型成本与任务成功率。
- 验收：全链路真机通过；任意错误有用户可理解的提示；不暴露密钥、临时 URL、精确位置或原图。

## 升级触发条件

出现以下任一情况时，评估迁移到云托管 + Redis/BullMQ Worker：峰值并发超过云函数安全阈值、任务积压无法及时恢复、单次任务超过函数时限、需要多步骤长时流程或需要运营后台批处理。迁移时保留本计划的集合字段、状态机、资产前缀和客户端 API 契约。
