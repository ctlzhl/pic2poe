# 🔧 故障排查指南

## ❌ 问题：移动端预览页面空白

### 已修复的问题

**原因分析**：
1. ✅ `app.json` 缺少 `"style": "v2"` 配置
2. ✅ `app.json` 缺少 `"navigationStyle": "default"` 配置
3. ✅ `index.json` 引用了不存在的自定义导航栏组件

**已应用的修复**：
- ✅ 添加了 `"style": "v2"` 到 `app.json`
- ✅ 添加了 `navigationStyle` 配置
- ✅ 移除了 `navigation-bar` 组件引用

---

## 🔍 常见问题排查清单

### 1️⃣ 页面空白问题

#### 检查步骤：

**步骤1：查看控制台报错**
```
1. 打开微信开发者工具
2. 点击底部"调试器"
3. 切换到"Console"标签
4. 查看是否有红色报错信息
```

**步骤2：检查文件路径**
```javascript
// 在 app.json 中检查
{
  "pages": [
    "pages/index/index",  // 确保文件存在
    "pages/result/result"
  ]
}
```

**步骤3：检查基础库版本**
```
1. 点击右上角"详情"
2. 查看"本地设置"
3. 调试基础库版本建议：2.20.0 或以上
```

**步骤4：检查样式问题**
```wxss
/* 确保 index.wxss 中有 */
.container {
  min-height: 100vh;
  /* 其他样式... */
}
```

**步骤5：清除缓存**
```
1. 点击工具栏"清缓存"
2. 选择"清除所有缓存"
3. 重新编译
```

---

### 2️⃣ 云开发相关问题

#### 问题：云函数调用失败

**报错信息**：
```
errCode: -1
errMsg: "cloud.callFunction:fail"
```

**解决方案**：

1. **检查环境ID配置**
```javascript
// app.js 中
wx.cloud.init({
  env: 'your-env-id',  // 👈 确保这里是你的真实环境ID
  traceUser: true,
})
```

2. **检查云开发是否开通**
```
开发者工具 → 云开发 → 如果未开通，点击"开通"
```

3. **检查云函数是否部署**
```
右键 cloudfunctions/generatePoem
→ 查看"云端文件夹"是否有绿色对勾
→ 如果没有，选择"上传并部署：云端安装依赖"
```

4. **检查云函数权限**
```
云开发控制台 → 云函数 → generatePoem → 配置
→ 确保权限配置正确
```

---

### 3️⃣ 图片选择问题

#### 问题：点击按钮无反应

**可能原因**：

1. **API权限未配置**
```json
// app.json 中确保有
{
  "permission": {
    "scope.writePhotosAlbum": {
      "desc": "保存图片到相册"
    }
  }
}
```

2. **真机权限未授权**
```
设置 → 微信 → 允许访问"相机"和"相册"
```

3. **基础库版本过低**
```
wx.chooseMedia 需要基础库 2.10.0+
如果提示不支持，改用 wx.chooseImage
```

**降级方案**：
```javascript
// 在 index.js 中替换
chooseImage() {
  const that = this
  // 检查是否支持 chooseMedia
  if (wx.chooseMedia) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        // ...
      }
    })
  } else {
    // 降级使用 chooseImage
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success(res) {
        that.setData({
          imageUrl: res.tempFilePaths[0]
        })
      }
    })
  }
}
```

---

### 4️⃣ AI生成失败

#### 问题：调用智谱AI失败

**报错信息**：
```
AI创作失败: invalid API key
```

**解决方案**：

1. **检查API Key配置**
```
云开发控制台 → 云函数 → generatePoem → 配置 → 环境变量
确保：ZHIPU_API_KEY = 你的真实API密钥
```

2. **验证API Key有效性**
```bash
# 本地测试（可选）
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer 你的API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4",
    "messages": [{"role":"user","content":"你好"}]
  }'
```

3. **检查账户余额**
```
登录 https://open.bigmodel.cn/
→ 个人中心 → 查看余额
→ 如果余额不足，充值最低10元
```

4. **查看云函数日志**
```
云开发控制台 → 云函数 → generatePoem → 日志
→ 查看详细错误信息
```

---

### 5️⃣ 图片合成失败

#### 问题：生成诗句成功，但图片合成失败

**报错信息**：
```
图片合成失败: Canvas is not defined
```

**解决方案**：

1. **检查canvas依赖是否安装**
```bash
cd cloudfunctions/generatePoem
npm install canvas --save
```

2. **重新上传云函数**
```
右键 generatePoem
→ 上传并部署：云端安装依赖
```

3. **提高云函数内存**
```
云开发控制台 → 云函数 → generatePoem → 配置
→ 内存：256MB → 512MB
```

4. **检查图片URL有效性**
```javascript
// 在云函数 index.js 中添加日志
console.log('图片URL:', imageUrl)
// 确保URL可访问
```

---

### 6️⃣ 保存图片失败

#### 问题：点击保存提示"保存失败"

**可能原因**：

1. **权限未授权**
```javascript
// 引导用户授权
wx.showModal({
  title: '需要相册权限',
  content: '请在设置中开启相册权限',
  confirmText: '去设置',
  success(res) {
    if (res.confirm) {
      wx.openSetting()
    }
  }
})
```

2. **真机测试问题**
```
- 模拟器可能不支持保存相册
- 请在真机上测试
- iPhone需要在"设置 → 微信 → 照片"中允许访问
```

3. **文件ID格式问题**
```javascript
// 确保使用临时文件路径，而不是fileID
wx.cloud.downloadFile({
  fileID: this.data.imageUrl,
  success: res => {
    wx.saveImageToPhotosAlbum({
      filePath: res.tempFilePath  // 使用临时路径
    })
  }
})
```

---

### 7️⃣ 分享功能问题

#### 问题：分享按钮无效

**解决方案**：

1. **检查页面配置**
```json
// result.json 中
{
  "enableShareAppMessage": true,
  "enableShareTimeline": true
}
```

2. **检查分享函数**
```javascript
// result.js 中必须有
onShareAppMessage() {
  return {
    title: '我用AI创作了一首诗',
    path: '/pages/index/index',
    imageUrl: this.data.imageUrl
  }
}
```

3. **真机测试**
```
分享朋友圈功能需要在真机测试
模拟器不支持分享到朋友圈
```

---

## 🛠️ 调试技巧

### 1. 使用console.log

```javascript
// 在关键位置添加日志
console.log('当前状态:', this.data)
console.log('图片路径:', imageUrl)
console.log('云函数返回:', funcRes)
```

### 2. 查看网络请求

```
调试器 → Network 标签
→ 查看所有网络请求
→ 检查是否有失败的请求
```

### 3. 真机调试

```
1. 手机和电脑连接同一Wi-Fi
2. 点击"真机调试"
3. 扫码后可以看到手机上的console日志
```

### 4. 云函数本地调试

```
右键云函数 → 开启云函数本地调试
→ 可以在本地查看详细日志
```

---

## 📱 平台兼容性

### iOS vs Android

| 功能 | iOS | Android | 说明 |
|------|-----|---------|------|
| 选择图片 | ✅ | ✅ | 都支持 |
| 保存相册 | ⚠️ | ✅ | iOS需手动授权 |
| 分享朋友圈 | ✅ | ✅ | 都支持 |
| Canvas渲染 | ✅ | ✅ | 服务端渲染，无差异 |

### 基础库版本要求

| API | 最低版本 | 替代方案 |
|-----|---------|---------|
| wx.chooseMedia | 2.10.0 | wx.chooseImage |
| wx.cloud | 2.2.3 | - |
| 分享朋友圈 | 2.11.3 | - |

---

## 🔄 快速修复流程

遇到问题？按照这个流程操作：

```
1. 清除缓存 → 重新编译
   ↓ 还是有问题？
2. 查看Console报错 → 根据报错信息搜索本文档
   ↓ 还是有问题？
3. 检查云开发配置 → 环境ID、API Key
   ↓ 还是有问题？
4. 真机测试 → 可能是模拟器问题
   ↓ 还是有问题？
5. 查看云函数日志 → 找到详细错误
   ↓ 还是有问题？
6. 联系技术支持
```

---

## 📞 获取帮助

### 官方文档
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [智谱AI文档](https://open.bigmodel.cn/dev/api)

### 社区支持
- [微信开放社区](https://developers.weixin.qq.com/community/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/wechat-miniprogram)

---

## ✅ 健康检查清单

部署前完整检查：

- [ ] 开发者工具可以正常预览
- [ ] 真机预览功能正常
- [ ] 图片选择功能正常
- [ ] 云函数调用成功
- [ ] AI生成古诗成功
- [ ] 图片合成成功
- [ ] 保存相册功能正常
- [ ] 分享功能正常
- [ ] 无Console报错
- [ ] 云函数日志无错误

全部打勾后，可以放心提交审核！✨

---

**更新日期**: 2024-11-18
**文档版本**: v1.0.0
