## 产品概述

将现有前端调用的云函数名从 `generatePoem` 切换为 `generatePoem_test`，保持其余配置和目录结构不变。

## 核心特性

- 定位前端所有调用 `generatePoem` 的位置
- 将调用名更新为 `generatePoem_test` 并保持参数与调用方式一致
- 快速回归确认其他配置、路径与依赖未改动

## 技术方案

- 架构：保持现有前端单体结构，集中修改云函数调用处
- 主要改动点：仅替换云函数调用名 `generatePoem` → `generatePoem_test`，不调整参数、接口路径与配置文件
- 数据流：用户触发前端调用 → 调用云函数 `generatePoem_test` → 返回结果原路径渲染
- 校验：代码搜索比对前后调用名，确保无遗漏且无新增配置变更

## 可用扩展

- **SubAgent: code-explorer**
- 目的：在仓库内全局搜索 `generatePoem` 调用位置
- 预期结果：列出所有调用点，避免遗漏修改