---
name: fine-tune-landscape-poem-layout
overview: 微调横向构图下的海报诗词排版：诗词内容整体上移，加大标题与正文间距，且保持二维码位置不变。
design:
  styleKeywords:
    - 中式排版
    - 留白艺术
    - 精致感
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 600
    subheading:
      size: 18px
      weight: 500
    body:
      size: 16px
      weight: 400
  colorSystem:
    primary:
      - "#333333"
    background:
      - "#FFFFFF"
    text:
      - "#333333"
      - "#666666"
todos:
  - id: explore-code
    content: 使用 [subagent:code-explorer] 定位 drawHorizontalPoem 和 measurePosterLayout 定义
    status: completed
  - id: analyze-coordinates
    content: 分析当前横向构图下的 Y 轴起始坐标计算逻辑
    status: completed
    dependencies:
      - explore-code
  - id: adjust-poem-upward
    content: 修改 drawHorizontalPoem 逻辑，使诗词内容整体上移
    status: completed
    dependencies:
      - analyze-coordinates
  - id: increase-title-gap
    content: 在绘图逻辑中增大标题与正文之间的间距常量
    status: completed
    dependencies:
      - adjust-poem-upward
  - id: verify-qr-position
    content: 检查 measurePosterLayout 确保二维码坐标计算未受干扰
    status: completed
    dependencies:
      - increase-title-gap
  - id: test-landscape-layout
    content: 在模拟器中预览不同长度诗词在横向构图下的排版效果
    status: completed
    dependencies:
      - verify-qr-position
---

## 产品概述

针对横向构图（Landscape）的海报生成逻辑进行视觉微调，优化诗词在海报中的分布比例，提升审美观感。

## 核心功能

- **布局微调**：专门针对横屏模式下的海报生成逻辑进行坐标优化。
- **内容上移**：将诗词标题与正文区域整体向上偏移，增加底部视觉留白感。
- **间距优化**：增大诗歌标题与第一行正文之间的垂直间距，提升排版呼吸感。
- **结构保持**：确保底部二维码区域的坐标独立性，不随诗词布局调整而移动。

## 技术栈

- **框架**：微信小程序原生开发
- **图形库**：微信小程序 Canvas 2D API
- **语言**：JavaScript

## 技术架构

### 模块划分

- **绘图核心模块 (Canvas Engine)**：包含 `drawHorizontalPoem` 函数，负责执行具体的绘制指令。
- **布局计算模块 (Layout Manager)**：包含 `measurePosterLayout` 函数，负责计算所有元素的坐标和尺寸。

### 数据流

1. 调用 `measurePosterLayout` 获取初始布局参数。
2. 将布局参数传递给 `drawHorizontalPoem`。
3. `drawHorizontalPoem` 根据调整后的 Y 坐标偏移量和行间距参数执行 `fillText` 绘制。

## 实现细节

### 关键代码逻辑

**坐标偏移调整**：在 `drawHorizontalPoem` 中，引入一个 `yOffset` 或直接修改起始绘制点坐标。
**间距变量修改**：定位到标题绘制后的坐标增量，增加一个固定像素值或比例值作为标题与正文的额外间距。

```javascript
// 逻辑示例
function drawHorizontalPoem(ctx, layout) {
  const startY = layout.poemStartY - 20; // 整体上移 20px
  const titleBodyGap = 30; // 增大后的间距
  // 绘制标题...
  // 绘制正文，起始点 = 标题位置 + titleBodyGap
}
```

## 设计风格

保持原有的极简诗意风格，但在横向构图下追求更优的黄金分割比例。

## 布局设计

- **诗词区域**：位于海报右侧或中心偏上位置。
- **动态呼吸感**：通过增加标题下方的空白，引导用户视觉先聚焦标题再平滑过渡至正文。
- **底部稳固**：二维码作为版权和来源标识，固定在海报右下角或指定位置，不受上方内容浮动影响。

## 代理扩展

### SubAgent

- **code-explorer**
- 目的：在项目中准确定位 `drawHorizontalPoem` 和 `measurePosterLayout` 函数所在的具体文件及上下文。
- 预期结果：获取相关函数的完整代码定义和当前布局常量的数值。