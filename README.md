# 照片有话说 · pic2poe

一张照片，换一种说法。

「照片有话说」是一款微信小程序：上传一张照片，选择五言绝句、图片点评或配图文案，将眼前所见写成可保存、可分享的作品。它希望让照片成为表达的起点，而不只是相册里的又一张图片。

创作流程保持简单：**选择照片 → 选择表达方式 → 查看作品 → 保存或分享**。

## 当前能力

- 图片上传、格式校验与缩略图处理，支持 JPG、PNG、WebP，单张最大 6MB
- 三种创作类型：五言绝句、图片点评、配图文案
- 创作任务、超时恢复、重试、频率限制与作品删除
- 分享成品图与小程序码
- 「我的作品」每页 10 条
- 「随便看看」博客浏览、类目筛选与文章详情
- 「我的」需先明确点击微信登录才能查看作品；头像与昵称可稍后填写，退出后重新登录即可恢复展示，作品不会删除

## 项目结构

```text
pages/              小程序页面
cloudfunctions/     CloudBase 云函数
docs/               部署、云端配置与验收说明
cloudbaserc.json    云函数部署清单与运行时配置
```

主要页面为：首页、随便看看、文章详情、创作、创作中、结果、我的、我的作品、设置与隐私说明。

项目采用原生微信小程序与 CloudBase：小程序负责选图、创作交互和结果展示；云函数处理图片、内容校验、创作任务、作品与分享；文档数据库和云存储保存必要的记录与图片。作品归属由云函数根据微信 `OPENID` 校验，分享通过独立凭证访问公开快照。

## 本地打开

1. 使用微信开发者工具导入本目录，并填写自己的小程序 AppID。
2. 创建自己的 CloudBase 环境，将 `app.js` 中的 `ENV_ID` 与 `cloudbaserc.json` 中的 `envId` 改为该环境 ID。
3. 按下方部署文档配置云函数、数据库集合和所需环境变量，再编译并在模拟器或真机预览。

仓库里的环境 ID 和示例配置不能替代你自己的云环境。不要把模型 API Key、小程序 AppSecret 或真实环境配置写入代码、数据库或 Git。`.env.example` 仅是本地配置示例；真实 `.env` 已被 Git 忽略。

## 云端部署

完整的集合、索引、权限、环境变量、Sharp 打包和验收步骤见：[P1 云端配置与验收](docs/P1-云端配置与验收.md)。

按实际改动范围部署对应云函数，再重新编译小程序。完整部署清单、Sharp 依赖与定时触发器见上面的验收文档；不要把下列示例当作线上已更新的证明。

```bash
tcb fn deploy prepareImage -r ap-shanghai
tcb fn deploy createCreation -r ap-shanghai
tcb fn deploy runCreation -r ap-shanghai
tcb fn deploy deleteWork -r ap-shanghai
tcb fn deploy listWorks -r ap-shanghai
tcb fn deploy getBlogPosts -r ap-shanghai
tcb fn deploy userProfile -r ap-shanghai
tcb fn deploy createShareCard -r ap-shanghai
tcb fn deploy getSharedWork -r ap-shanghai
```

`prepareImage` 使用 Linux x64 的 Sharp 依赖，部署前请按云端配置文档安装对应平台依赖。其余函数由 CloudBase 在云端安装依赖。

## 验证

在项目根目录运行：

```bash
node --test $(rg --files -g '*test.js' -g '!node_modules/**' -g '!miniprogram_npm/**' -g '!output/**' | sort)
```

除自动测试外，真机应覆盖头像与昵称更新、创作、同图重新创作后删除其中一份作品、作品分页、分享和扫码打开分享页。
