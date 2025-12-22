## Product Overview

回退广告相关改动，恢复生成流程至无广告的旧逻辑，清理广告页、路由、全局状态与调用链。

## Core Features

- 移除广告页面与对应路由
- 删除广告相关全局状态与调用逻辑
- 恢复生成流程为无广告的旧版本行为
- 对齐至请求ID f3d5d188841f42c0a34be0c523a60d77/0d27fce513f34f07a9f9eb6e477307fa 状态

## Tech Stack

- 沿用现有项目技术栈进行代码回退与清理
- 重点处理路由、页面、全局状态管理及生成流程逻辑

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 快速定位并梳理广告页、路由、全局状态及调用链的分布
- Expected outcome: 列出相关文件与关键代码位置，为后续清理提供依据