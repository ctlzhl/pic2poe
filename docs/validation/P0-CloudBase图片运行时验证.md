# P0 CloudBase 图片运行时验证

本验证只确认图片处理运行时是否可用，不会改动现有小程序业务流程。

## 你需要做什么

1. 用微信开发者工具打开本项目：`/Users/michael/WeChatProjects/pic2poe`。
2. 确认顶部云开发环境选择的是 `cloud1-8gefec0p0d1f809d`。
3. 在左侧找到 `cloudfunctions/validateImageRuntime`，右键选择“上传并部署：云端安装依赖”。
4. 打开“云开发 -> 存储”，上传这些样本：
   - 一张 JPG
   - 一张 PNG
   - 一张 WebP
   - 一张 iPhone HEIC
   - `docs/validation/broken-image.jpg`
   - 如手头有多帧 WebP，也上传一张
5. 复制每个文件的 `fileID`。
6. 打开“云开发 -> 云函数 -> validateImageRuntime -> 测试”，填入：

```json
{
  "fileIDs": [
    "cloud://这里替换成你的JPG文件ID",
    "cloud://这里替换成你的PNG文件ID",
    "cloud://这里替换成你的WebP文件ID",
    "cloud://这里替换成你的HEIC文件ID",
    "cloud://这里替换成broken-image文件ID"
  ],
  "keepDerived": true
}
```

## 怎么判断通过

- JPG、PNG、WebP 都应该返回 `ok: true`，并带有 `outputFileIDs.creationFileID` 与 `outputFileIDs.thumbnailFileID`。
- HEIC 如果返回 `ok: true`，说明当前 CloudBase 运行时可直接进入功能开发。
- HEIC 如果返回 `ok: false`，且错误来自 `decode_or_derive`，说明需要先处理 HEIC 支持策略。
- `broken-image.jpg` 应该返回 `ok: false`，这是预期结果。
- 多帧 WebP 如返回 `input.pages > 1` 且 `ok: true`，说明可以按首帧派生；如失败，需要把多帧 WebP 先列为不支持格式。

## 失败时的处理原则

- 只有 HEIC 失败：MVP 可先提示“当前暂不支持 HEIC，请选择 JPG/PNG/WebP”，也可继续投入解决 HEIC 运行时。
- WebP 失败：先确认是否是动图 WebP；普通 WebP 必须支持，否则不进入 P1。
- JPG/PNG 失败：暂停实现主流程，优先排查云函数依赖安装或运行时配置。
- 损坏文件成功：这是严重问题，说明格式校验不足，不能进入 P1。

## 验证后告诉我

把测试返回里的 `summary`、`runtime.node`、`runtime.sharpVersions.vips`，以及每个样本的 `ok/stage/message/input.format/input.pages` 发给我即可。
