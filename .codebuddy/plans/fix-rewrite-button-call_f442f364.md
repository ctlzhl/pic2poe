## Product Overview

修复结果页“重写一首”按钮点击后未触发云函数的逻辑，确保按钮可用且生成流程正常。

## Core Features

- 点击“重写一首”触发事件并准备完整 fileID
- 校验并调用 generatePoem 云函数，处理成功/失败提示
- 保持结果页交互流畅，必要的加载状态提示

## 技术方案

- 现有微信小程序代码维护，沿用小程序前端与云函数调用模式
- 核心位置：result.js 点击事件、ensureImageFileReady 流程、getCloudFunctionName 调用
- 增加异常捕获与调用前后状态控制，保证 fileID 校验与云函数入参完整

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 全局检索 result 页按钮绑定、ensureImageFileReady 与 generatePoem 调用路径，定位问题
- Expected outcome: 找到点击事件未触发或调用缺失的根因及相关文件