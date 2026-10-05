const STACKED_WIDTH = 1440
const PORTRAIT_HEIGHT = 1800
const SIDE_TEXT_WIDTH = 640
const QR_SIZE = 150

const editorialTypography = () => ({
  title: { fontSize: 72, lineHeight: 94 },
  body: { fontSize: 50, lineHeight: 74 },
  tags: { fontSize: 32, lineHeight: 44 }
})

const visualImageAspect = ({ width = 1, height = 1, orientation = 1 } = {}) => {
  const rawWidth = Math.max(1, Number(width) || 1)
  const rawHeight = Math.max(1, Number(height) || 1)
  const isRotated = [5, 6, 7, 8].includes(Number(orientation))
  return isRotated ? rawHeight / rawWidth : rawWidth / rawHeight
}

const editorialLayoutFor = (metadata = {}) => ({
  kind: visualImageAspect(metadata) < 1 ? 'side-by-side' : 'stacked',
  imageAspect: visualImageAspect(metadata)
})

const portraitPhoto = (imageAspect) => ({
  left: 0,
  top: 0,
  width: Math.max(1, Math.round(PORTRAIT_HEIGHT * imageAspect)),
  height: PORTRAIT_HEIGHT,
  fit: 'cover',
  position: 'centre'
})

const stackedPhoto = (imageAspect, top = 0) => ({
  left: 0,
  top,
  width: STACKED_WIDTH,
  height: Math.max(1, Math.round(STACKED_WIDTH / imageAspect)),
  fit: 'cover',
  position: 'centre'
})

const editorialSideBySideLayout = ({ imageAspect = 0.75, titleLineCount = 1, bodyLineCount = 1 } = {}) => {
  const photo = portraitPhoto(imageAspect)
  const typography = editorialTypography()
  const titleLines = Math.min(3, Math.max(1, Number(titleLineCount) || 1))
  const bodyLines = Math.min(6, Math.max(1, Number(bodyLineCount) || 1))
  const titleHeight = typography.title.fontSize + (titleLines - 1) * typography.title.lineHeight
  const bodyHeight = typography.body.fontSize + (bodyLines - 1) * typography.body.lineHeight
  const groupHeight = titleHeight + 56 + bodyHeight + 56 + typography.tags.fontSize
  const groupTop = 120 + Math.round((1360 - groupHeight) / 2)
  const titleY = groupTop + typography.title.fontSize
  const bodyY = titleY + (titleLines - 1) * typography.title.lineHeight + 56 + typography.body.fontSize
  const tagsY = bodyY + (bodyLines - 1) * typography.body.lineHeight + 56 + typography.tags.fontSize

  return {
    canvas: { width: photo.width + SIDE_TEXT_WIDTH, height: PORTRAIT_HEIGHT },
    photo,
    text: { x: photo.width + 64, anchor: 'start', titleY, bodyY, tagsY },
    qr: { left: photo.width + SIDE_TEXT_WIDTH - 64 - QR_SIZE, top: PORTRAIT_HEIGHT - 72 - QR_SIZE, size: QR_SIZE }
  }
}

const editorialStackedLayout = ({ imageAspect = 16 / 9, titleLineCount = 1, bodyLineCount = 1 } = {}) => {
  const photo = stackedPhoto(imageAspect)
  const typography = editorialTypography()
  const titleLines = Math.min(2, Math.max(1, Number(titleLineCount) || 1))
  const bodyLines = Math.min(4, Math.max(1, Number(bodyLineCount) || 1))
  const titleY = photo.height + 88 + typography.title.fontSize
  const bodyY = titleY + (titleLines - 1) * typography.title.lineHeight + 64 + typography.body.fontSize
  const tagsY = bodyY + (bodyLines - 1) * typography.body.lineHeight + 72 + typography.tags.fontSize
  const qrTop = tagsY + 56

  return {
    canvas: { width: STACKED_WIDTH, height: qrTop + QR_SIZE + 72 },
    photo,
    text: { x: 84, anchor: 'start', titleY, bodyY, tagsY },
    qr: { left: STACKED_WIDTH - 84 - QR_SIZE, top: qrTop, size: QR_SIZE }
  }
}

const landscapePoemLayout = ({ imageAspect = 16 / 9 } = {}) => {
  const textHeight = 720
  const photo = stackedPhoto(imageAspect, textHeight)
  return {
    canvas: { width: STACKED_WIDTH, height: textHeight + photo.height },
    photo,
    text: { x: STACKED_WIDTH / 2, anchor: 'middle', titleY: 150, bodyY: 280 },
    qr: { left: STACKED_WIDTH - 84 - QR_SIZE, top: 520, size: QR_SIZE }
  }
}

const portraitPoemLayout = ({ titleLineCount = 1, poemLineCount = 4, imageAspect = 0.75 } = {}) => {
  const titleLines = Math.min(2, Math.max(1, Number(titleLineCount) || 1))
  const poemLines = Math.min(4, Math.max(1, Number(poemLineCount) || 1))
  const photo = portraitPhoto(imageAspect)
  const titleHeight = 58 + (titleLines - 1) * 78
  const poemHeight = 48 + (poemLines - 1) * 90
  const groupHeight = titleHeight + 70 + poemHeight
  const groupTop = 120 + Math.round((1360 - groupHeight) / 2)
  const titleY = groupTop + 58

  return {
    canvas: { width: photo.width + SIDE_TEXT_WIDTH, height: PORTRAIT_HEIGHT },
    photo,
    text: {
      x: photo.width + SIDE_TEXT_WIDTH / 2,
      anchor: 'middle',
      titleY,
      bodyY: titleY + (titleLines - 1) * 78 + 70 + 48
    },
    qr: { left: photo.width + SIDE_TEXT_WIDTH - 64 - QR_SIZE, top: PORTRAIT_HEIGHT - 72 - QR_SIZE, size: QR_SIZE }
  }
}

module.exports = {
  landscapePoemLayout,
  portraitPoemLayout,
  editorialTypography,
  editorialLayoutFor,
  editorialSideBySideLayout,
  editorialStackedLayout,
  visualImageAspect
}
