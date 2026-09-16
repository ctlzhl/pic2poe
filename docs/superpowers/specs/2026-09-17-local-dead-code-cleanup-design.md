# 本地未调用代码清理设计

## 目标

移除当前小程序运行、部署配置与定时任务均不会使用的本地代码和资源，缩小项目体积并收敛维护入口。

## 保留边界

- `app.json` 注册的全部页面和 `cloudbaserc.json` 声明的全部云函数。
- 现有创作、分享、博客、作品和用户资料调用链。
- 云端已经部署的函数、数据库、存储对象和定时任务。本次不执行任何远端删除。
- 现有业务与部署文档；它们可能含历史说明，但不属于本次“移除未调用代码”范围。
- 用户工作区中与本次无关的已删除文章。

## 清理范围

1. 删除未配置、未被调用的旧生成函数与一次性运行时验证函数：
   `generatePoem`、`generatePoem_test`、`validateImageRuntime`、
   `validateImageRuntimeV2`、`validateImageRuntimeV3`。
2. 删除未被页面注册或引用的 `components/navigation-bar`。
3. 删除已被服务端分享卡片替代的工具模块：`utils/env.js`、
   `utils/poem.js`、`utils/canvasPoster.js`。
4. 删除只被上述旧模块使用或无任何引用的海报、二维码、占位图和旧 SVG 资源。
5. 删除空的 `minitest/test.config.json`。
6. 收敛仍在使用的文件：
   - `app.js` 删除未读取的 `globalData`。
   - `utils/requestHelper.js` 删除未调用的相册保存包装。
   - `utils/errorHandler.js` 保留 `showErrorToast` 与其内部依赖，移除未导入的旧弹窗接口。
   - `utils/image.js` 保留当前上传流程所需的扩展名解析接口。

## 验收标准

- 现有功能测试在清理前后均可执行；不为“文件已删除”保留脆弱的源码文本测试。
- `cloudbaserc.json` 中的每个云函数在本地仍有对应目录。
- 现有 Node 测试全部通过。
- 通过代码搜索确认没有运行时代码再引用已移除的名称或路径。
- 仅本次清理文件进入提交；不包含用户已有的文章删除。
