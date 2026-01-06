---
name: fix-background-image-stretching
overview: 修复海报背景图拉伸问题，实现等比缩放裁剪（Cover模式）效果，确保视觉不失真。
todos:
  - id: locate-draw-function
    content: 使用 [subagent:code-explorer] 搜索并定位 drawBackgroundLayer 函数位置
    status: completed
  - id: analyze-current-logic
    content: 分析当前 drawImage 的参数调用及背景图加载逻辑
    status: completed
    dependencies:
      - locate-draw-function
  - id: implement-aspect-fill
    content: 在 drawBackgroundLayer 中编写 Cover 模式比例计算逻辑
    status: completed
    dependencies:
      - analyze-current-logic
  - id: update-canvas-draw
    content: 更新 drawImage 调用参数，应用计算出的裁剪坐标和尺寸
    status: completed
    dependencies:
      - implement-aspect-fill
  - id: verify-visual-effect
    content: 验证不同比例背景图在预览及导出海报时的显示效果
    status: completed
    dependencies:
      - update-canvas-draw
---

## 产品概述

修复海报生成功能中的背景图拉伸问题。当前背景图在绘制时被强制拉伸至海报尺寸，导致视觉失真。需要实现等比缩放裁剪（Cover模式）逻辑。

## 核心功能

- **背景图等比缩放**：根据背景图原比例与海报画布比例的关系，计算缩放倍率。
- **居中裁剪绘制**：在保持比例的前提下，自动截取图片中心区域填满画布。
- **视觉无损输出**：确保不同分辨率和比例的背景图在海报中均能自然呈现，不产生压扁或拉长现象。

## 技术栈

- **开发平台**：微信小程序 (Mini Program)
- **绘图引擎**：Canvas 2D API
- **语言**：JavaScript / TypeScript

## 技术方案

### 核心算法：Aspect Fill (Cover) 逻辑

1. 获取背景图原始宽高 ($W_i, H_i$) 及海报画布目标宽高 ($W_c, H_c$)。
2. 计算比例：$R = \max(W_c / W_i, H_c / H_i)$。
3. 计算裁剪区域大小：$S_w = W_c / R, S_h = H_c / R$。
4. 计算裁剪起始坐标（居中）：$S_x = (W_i - S_w) / 2, S_y = (H_i - S_h) / 2$。
5. 调用 `drawImage(img, S_x, S_y, S_w, S_h, 0, 0, W_c, H_c)` 执行绘制。

## 实现细节

### 修改范围

```
project-root/
└── src/
    └── utils/ (或 services/)
        └── poster.js/ts  # 包含 drawBackgroundLayer 的绘图逻辑文件
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索并定位项目中定义 `drawBackgroundLayer` 函数的具体文件及上下文代码。
- Expected outcome: 准确找到需要修改的绘图逻辑所在的文件路径和代码行。