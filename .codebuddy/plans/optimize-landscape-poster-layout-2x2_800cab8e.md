---
name: optimize-landscape-poster-layout-2x2
overview: 优化横向/正方形构图下的海报布局，将诗词区域调整为“每行两句”的横排布局，竖向构图则保持原有“左图右诗”垂直布局不变。
design:
  architecture:
    component: tdesign
  styleKeywords:
    - 中式极简
    - 动态布局
    - 画册感
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 600
    subheading:
      size: 18px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#333333"
    background:
      - "#FFFFFF"
      - "#F5F5F5"
    text:
      - "#1A1A1A"
      - "#666666"
---

## 产品概述

优化“图配诗”海报生成器的布局逻辑，根据用户上传图片的构图比例（横向/正方形 vs 竖向）动态调整诗词排版，提升海报的美观度和易读性。

## 核心功能

- **构图自动识别**：根据图片的宽高比自动判定为“竖向构图”或“横向/正方形构图”。
- **竖向布局维持**：针对竖屏图片，保持现有的“左图右诗”布局，诗词采用传统的垂直竖排格式。
- **横屏 2x2 布局优化**：针对横向或正方形图片，采用“上诗下图”布局。诗词区域重构为“每行两句”的 2x2 矩阵排版（例如：第一二句在一行，第三四句在二行）。
- **动态样式适配**：自动调整间距、字体大小以适配不同构图下的视觉重心。

## 视觉效果

- **竖向构图**：左侧展示图片，右侧留白区域优雅地展示竖排诗词，充满艺术气息。
- **横向/正方形构图**：顶部居中展示 2x2 排版的诗句，下方承接主体图片，结构稳定平衡。

## 技术栈

- **框架**: 微信小程序原生框架 (WXML/WXSS/JS)
- **布局技术**: Flexbox, CSS Grid
- **逻辑层**: JavaScript (用于比例计算与布局判定)

## 系统架构

### 模块划分

- **LayoutManager**: 负责计算图片比例，返回当前布局模式（PORTRAIT | LANDSCAPE_SQUARE）。
- **PoemRenderer**: 根据布局模式动态渲染 WXML 结构，实现 2x2 或竖排转换。
- **PosterContainer**: 顶层容器，通过 CSS Class 切换整体布局流。

### 数据流

图片加载完毕 -> 获取图片尺寸 -> 计算宽高比 -> 更新 layoutMode 状态 -> WXML 条件渲染对应布局。

## 关键代码结构

### 布局判定逻辑

```javascript
const getLayoutMode = (width, height) => {
  const ratio = width / height;
  return ratio >= 1 ? 'LANDSCAPE_SQUARE' : 'PORTRAIT';
};
```

### 2x2 诗词分行算法

```javascript
// 将 4 句诗转为 [[1,2], [3,4]] 结构
const formatPoem2x2 = (lines) => {
  const result = [];
  for (let i = 0; i < lines.length; i += 2) {
    result.push(lines.slice(i, i + 2));
  }
  return result;
};
```

## 设计风格

保持中国传统文化韵味与现代极简主义的结合。

- **竖向构图**：强调留白与呼吸感，诗词字体较小，垂直排列。
- **横向构图**：2x2 布局需保证诗句对齐，行间距适中，营造现代画册感。

## 代理扩展

### SubAgent

- **code-explorer**
- **用途**: 深入探索 `/Users/michael/WeChatProjects/pic2poe` 项目源码，定位当前海报生成的 WXML 模板、WXSS 样式文件以及负责布局判定的逻辑脚本。
- **预期效果**: 明确海报组件的具体路径（如 `components/poster/`），并识别现有的“左图右诗”实现方式。