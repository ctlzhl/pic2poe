const CANVAS_WIDTH = 1440
const CANVAS_HEIGHT = 1800
const CARD_GAP = 48
const PHOTO_MIN_WIDTH = 720
const PHOTO_MAX_WIDTH = 1000
const QR_SIZE = 150

const editorialTypography = () => ({
  label: { fontSize: 30, lineHeight: 40 },
  title: { fontSize: 64, lineHeight: 84 },
  body: { fontSize: 42, lineHeight: 64 },
  tags: { fontSize: 30, lineHeight: 40 }
})

const visualImageAspect = ({ width = 1, height = 1, orientation = 1 } = {}) => {
  const rawWidth = Math.max(1, Number(width) || 1)
  const rawHeight = Math.max(1, Number(height) || 1)
  const isRotated = [5, 6, 7, 8].includes(Number(orientation))
  return isRotated ? rawHeight / rawWidth : rawWidth / rawHeight
}

// 图评、文案以展示方向判定版式：方图归入上图下文，避免右侧文字区过窄。
const editorialLayoutFor = (metadata = {}) => ({
  kind: visualImageAspect(metadata) < 1 ? 'side-by-side' : 'stacked',
  imageAspect: visualImageAspect(metadata)
})

const editorialSideBySideLayout = ({ imageAspect = 0.75, titleLineCount = 1, bodyLineCount = 1 } = {}) => {
  const safeImageAspect = Math.min(0.99, Math.max(0.3, Number(imageAspect) || 0.75))
  const safeTitleLines = Math.min(3, Math.max(1, Number(titleLineCount) || 1))
  const safeBodyLines = Math.min(6, Math.max(1, Number(bodyLineCount) || 1))
  const availablePhotoHeight = CANVAS_HEIGHT - CARD_GAP * 2
  const photoWidth = Math.min(820, Math.round(availablePhotoHeight * safeImageAspect))
  const photoHeight = Math.min(availablePhotoHeight, Math.round(photoWidth / safeImageAspect))
  const photoTop = CARD_GAP + Math.round((availablePhotoHeight - photoHeight) / 2)
  const textLeft = photoWidth + 72
  const typography = editorialTypography()
  const titleHeight = typography.title.fontSize + (safeTitleLines - 1) * typography.title.lineHeight
  const bodyHeight = typography.body.fontSize + (safeBodyLines - 1) * typography.body.lineHeight
  const groupHeight = typography.label.fontSize + 64 + titleHeight + 66 + bodyHeight + 64 + typography.tags.fontSize
  const groupTop = 180 + Math.round((1320 - groupHeight) / 2)
  const labelY = groupTop + typography.label.fontSize
  const titleY = labelY + 64 + typography.title.fontSize
  const bodyY = titleY + (safeTitleLines - 1) * typography.title.lineHeight + 66 + typography.body.fontSize
  const tagsY = bodyY + (safeBodyLines - 1) * typography.body.lineHeight + 64 + typography.tags.fontSize

  return {
    photo: { left: 0, top: photoTop, width: photoWidth, height: photoHeight, fit: 'contain', position: 'centre' },
    text: { x: textLeft, anchor: 'start', labelY, titleY, bodyY, tagsY },
    qr: { left: 1206, top: 1600, size: QR_SIZE }
  }
}

const landscapePoemLayout = () => ({
  photo: {
    left: 0,
    top: 780,
    width: CANVAS_WIDTH,
    height: 1020,
    fit: 'contain',
    position: 'centre'
  },
  text: {
    x: CANVAS_WIDTH / 2,
    anchor: 'middle',
    titleY: 172,
    bodyY: 300
  },
  qr: { left: 1180, top: 540, size: QR_SIZE }
})

const portraitPoemLayout = ({ titleLineCount = 1, poemLineCount = 4, imageAspect = 0.75 } = {}) => {
  const safeTitleLines = Math.min(2, Math.max(1, Number(titleLineCount) || 1))
  const safePoemLines = Math.min(4, Math.max(1, Number(poemLineCount) || 1))
  const safeImageAspect = Math.min(1, Math.max(0.3, Number(imageAspect) || 0.75))
  const titleFontSize = 58
  const titleLineHeight = 78
  const poemFontSize = 48
  const poemLineHeight = 90
  const titleHeight = titleFontSize + (safeTitleLines - 1) * titleLineHeight
  const poemHeight = poemFontSize + (safePoemLines - 1) * poemLineHeight
  const titleToPoemGap = 74
  const contentTop = 180
  const contentBottom = 1460
  const groupHeight = titleHeight + titleToPoemGap + poemHeight
  const groupTop = contentTop + (contentBottom - contentTop - groupHeight) / 2
  const titleY = Math.round(groupTop + titleFontSize)
  const availablePhotoHeight = CANVAS_HEIGHT - CARD_GAP * 2
  const photoWidth = Math.min(PHOTO_MAX_WIDTH, Math.max(PHOTO_MIN_WIDTH, Math.round(availablePhotoHeight * safeImageAspect)))
  const photoHeight = Math.min(availablePhotoHeight, Math.round(photoWidth / safeImageAspect))
  const photoTop = CARD_GAP + Math.round((availablePhotoHeight - photoHeight) / 2)
  const rightPanelWidth = CANVAS_WIDTH - photoWidth
  const rightPanelCenter = photoWidth + rightPanelWidth / 2

  return {
    photo: {
      left: 0,
      top: photoTop,
      width: photoWidth,
      height: photoHeight,
      fit: 'contain',
      position: 'centre'
    },
    text: {
      x: rightPanelCenter,
      anchor: 'middle',
      titleY,
      bodyY: Math.round(titleY + (safeTitleLines - 1) * titleLineHeight + titleToPoemGap + poemFontSize)
    },
    qr: { left: Math.round(rightPanelCenter - QR_SIZE / 2), top: 1580, size: QR_SIZE }
  }
}

module.exports = { landscapePoemLayout, portraitPoemLayout, editorialTypography, editorialLayoutFor, editorialSideBySideLayout }
