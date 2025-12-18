const BACKGROUND_TOP_COLOR = '#fdf8ef'
const BACKGROUND_BOTTOM_COLOR = '#efe2ca'
const POEM_TEXT_COLOR = '#3F3A3A'
const SUMMARY_TEXT_COLOR = '#6B6B6B'
const BRANDING_TEXT_COLOR = '#5A4A3A'
const BRANDING_TEXT = '拍照成诗 · Pic2Poe'
const QR_HINT_TEXT = '长按识别二维码'

const DEFAULT_POSTER_WIDTH = 600
const DEFAULT_POSTER_HEIGHT = 800

function drawRoundedRectangle(context, x, y, width, height, radius) {
  const cornerRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  const right = x + width
  const bottom = y + height

  context.beginPath()
  context.moveTo(x + cornerRadius, y)
  context.lineTo(right - cornerRadius, y)
  context.quadraticCurveTo(right, y, right, y + cornerRadius)
  context.lineTo(right, bottom - cornerRadius)
  context.quadraticCurveTo(right, bottom, right - cornerRadius, bottom)
  context.lineTo(x + cornerRadius, bottom)
  context.quadraticCurveTo(x, bottom, x, bottom - cornerRadius)
  context.lineTo(x, y + cornerRadius)
  context.quadraticCurveTo(x, y, x + cornerRadius, y)
  context.closePath()
}

function drawBackgroundLayer(context, posterWidth, posterHeight) {
  const gradient = context.createLinearGradient(0, 0, 0, posterHeight)
  gradient.addColorStop(0, '#fdf7ea')
  gradient.addColorStop(0.4, '#f3e3c6')
  gradient.addColorStop(1, '#e4cfaa')

  context.setFillStyle(gradient)
  context.fillRect(0, 0, posterWidth, posterHeight)

  context.setFillStyle('rgba(255, 255, 255, 0.06)')
  const dotSpacing = 20
  for (let rowIndex = 0; rowIndex < posterHeight; rowIndex += dotSpacing) {
    for (let columnIndex = 0; columnIndex < posterWidth; columnIndex += dotSpacing) {
      if ((rowIndex + columnIndex) % (dotSpacing * 2) === 0) {
        context.fillRect(columnIndex, rowIndex, 1, 1)
      }
    }
  }

  context.setStrokeStyle('rgba(96, 72, 40, 0.35)')
  context.setLineWidth(2)
  drawRoundedRectangle(context, 18, 18, posterWidth - 36, posterHeight - 36, 18)
  context.stroke()

  context.setStrokeStyle('rgba(96, 72, 40, 0.18)')
  context.setLineWidth(1)
  drawRoundedRectangle(context, 32, 32, posterWidth - 64, posterHeight - 64, 14)
  context.stroke()
}

function measurePosterLayout(options) {
  const posterWidth = options.posterWidth || DEFAULT_POSTER_WIDTH
  const posterHeight = options.posterHeight || DEFAULT_POSTER_HEIGHT
  const imageAspectRatio = options.imageAspectRatio && options.imageAspectRatio > 0 ? options.imageAspectRatio : 3 / 4

  const layout = {
    mode: 'portrait',
    imageFrame: { x: 0, y: 0, width: 0, height: 0 },
    textFrame: { x: 0, y: 0, width: 0, height: 0 },
    qrFrame: { x: 0, y: 0, size: 0 }
  }

  const outerPadding = 40
  const cardRadius = 28

  const usableWidth = posterWidth - outerPadding * 2
  const imageRegionHeight = posterHeight * 0.48

  const cardX = outerPadding
  const cardY = outerPadding
  const cardWidth = usableWidth
  const cardHeight = imageRegionHeight

  layout.imageFrame = {
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight
  }

  const textRegionTop = cardY + cardHeight + 40
  const bottomReservedHeight = posterHeight * 0.17
  const textRegionHeight = Math.max(80, posterHeight - textRegionTop - bottomReservedHeight)

  layout.textFrame = {
    x: outerPadding,
    y: textRegionTop,
    width: usableWidth,
    height: textRegionHeight
  }

  const qrSize = 120
  const imageFrame = layout.imageFrame
  const textFrame = layout.textFrame
  const qrMarginLeftFromImage = 24
  const qrCardPadding = 16
  const extraCardHeightBelowQr = 64

  const textFrameBottom = textFrame.y + textFrame.height
  const qrFrameY = textFrameBottom - qrSize - qrCardPadding - extraCardHeightBelowQr

  layout.qrFrame = {
    x: imageFrame.x + qrMarginLeftFromImage,
    y: qrFrameY,
    size: qrSize
  }

  layout.cardRadius = cardRadius
  layout.posterWidth = posterWidth
  layout.posterHeight = posterHeight

  return layout
}

function drawMainImageBlock(context, imagePath, layout) {
  const frame = layout.imageFrame
  if (!imagePath || !frame || !frame.width || !frame.height) {
    return
  }

  const shadowOffset = 12

  context.save()
  context.setFillStyle('rgba(0, 0, 0, 0.12)')
  drawRoundedRectangle(context, frame.x + shadowOffset, frame.y + shadowOffset, frame.width, frame.height, layout.cardRadius + 6)
  context.fill()

  context.save()
  drawRoundedRectangle(context, frame.x, frame.y, frame.width, frame.height, layout.cardRadius)
  context.clip()
  context.setFillStyle('#E5E5E5')
  context.fillRect(frame.x, frame.y, frame.width, frame.height)
  context.drawImage(imagePath, frame.x, frame.y, frame.width, frame.height)
  context.restore()

  context.setStrokeStyle('rgba(255, 255, 255, 0.85)')
  context.setLineWidth(2)
  drawRoundedRectangle(context, frame.x, frame.y, frame.width, frame.height, layout.cardRadius)
  context.stroke()
  context.restore()
}

function drawVerticalPoem(context, poemTitle, poemLines, textFrame) {
  const effectiveLines = Array.isArray(poemLines) ? poemLines : []
  const trimmedLines = effectiveLines
    .map((line) => (line || '').trim())
    .filter((line) => !!line)

  const linesToRender = trimmedLines.slice(0, 4)

  context.save()
  context.setFillStyle(POEM_TEXT_COLOR)
  context.setFontSize(32)
  context.setTextBaseline('top')

  const totalColumns = linesToRender.length + (poemTitle ? 1 : 0)
  if (totalColumns === 0) {
    context.restore()
    return
  }

  const maxAvailableWidth = textFrame.width
  const columnSpacing = Math.min(48, maxAvailableWidth / (totalColumns + 1))
  const baseColumnX = textFrame.x + textFrame.width - columnSpacing
  const topY = textFrame.y
  const characterSpacing = 36

  let currentColumnIndex = 0

  if (poemTitle) {
    const titleColumnX = baseColumnX - currentColumnIndex * columnSpacing
    const titleCharacters = String(poemTitle).split('')
    context.setFontSize(38)
    titleCharacters.forEach((character, index) => {
      const characterY = topY + index * characterSpacing
      context.fillText(character, titleColumnX, characterY)
    })
    currentColumnIndex += 1
    context.setFontSize(32)
  }

  linesToRender.forEach((lineText, lineIndex) => {
    const columnX = baseColumnX - (currentColumnIndex + lineIndex) * columnSpacing
    const characters = String(lineText).split('')
    characters.forEach((character, index) => {
      const characterY = topY + index * characterSpacing
      context.fillText(character, columnX, characterY)
    })
  })

  context.restore()
}

function drawImagerySummary(context, imagerySummary, textFrame) {
  const content = (imagerySummary || '').trim()
  if (!content) {
    return
  }

  context.save()
  context.setFillStyle(SUMMARY_TEXT_COLOR)
  context.setFontSize(22)
  context.setTextBaseline('top')

  const maxLineWidth = textFrame.width * 0.7
  const baseX = textFrame.x
  const baseY = textFrame.y + textFrame.height * 0.55

  let currentLine = ''
  const lines = []

  for (let index = 0; index < content.length; index += 1) {
    const next = currentLine + content[index]
    const metrics = context.measureText(next)
    if (metrics.width > maxLineWidth && currentLine) {
      lines.push(currentLine)
      currentLine = content[index]
    } else {
      currentLine = next
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  const maxLines = 3
  const linesToRender = lines.slice(0, maxLines)
  const lineHeight = 30

  linesToRender.forEach((lineText, index) => {
    context.fillText(lineText, baseX, baseY + index * lineHeight)
  })

  context.restore()
}

function drawQrPlaceholderAndBrand(context, layout) {
  const qrFrame = layout.qrFrame
  const cardPadding = 16

  context.save()

  context.setFillStyle('rgba(255, 255, 255, 0.9)')
  drawRoundedRectangle(
    context,
    qrFrame.x - cardPadding,
    qrFrame.y - cardPadding,
    qrFrame.size + cardPadding * 2,
    qrFrame.size + cardPadding * 2 + 64,
    20
  )
  context.fill()

  const qrImageSrc = '/static/qr/poster-entry.png'
  context.setFillStyle('#E5E5E5')
  context.fillRect(qrFrame.x, qrFrame.y, qrFrame.size, qrFrame.size)
  context.drawImage(qrImageSrc, qrFrame.x, qrFrame.y, qrFrame.size, qrFrame.size)

  context.setFillStyle(BRANDING_TEXT_COLOR)
  context.setFontSize(20)
  context.setTextBaseline('top')
  const hintY = qrFrame.y + qrFrame.size + 10
  context.fillText(QR_HINT_TEXT, qrFrame.x - cardPadding + 4, hintY)

  context.restore()
}

function renderPosterToTempFilePath(options) {
  const canvasId = options.canvasId || 'sharePosterCanvas'
  const posterWidth = options.posterWidth || DEFAULT_POSTER_WIDTH
  const posterHeight = options.posterHeight || DEFAULT_POSTER_HEIGHT

  const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null
  const pixelRatio = options.pixelRatio || (systemInfo && systemInfo.pixelRatio) || 2

  const posterLogicalWidth = posterWidth
  const posterLogicalHeight = posterHeight
  const posterRealWidth = posterLogicalWidth * pixelRatio
  const posterRealHeight = posterLogicalHeight * pixelRatio

  const imagePath = options.imagePath
  const poemTitle = options.poemTitle || ''
  const poemLines = options.poemLines || []
  const imagerySummary = options.imagerySummary || ''

  const imageMeta = options.imageMeta || {}
  const imageWidth = imageMeta.width
  const imageHeight = imageMeta.height
  const imageAspectRatio = imageWidth && imageHeight && imageHeight > 0 ? imageWidth / imageHeight : 3 / 4

  const layout = measurePosterLayout({
    posterWidth: posterLogicalWidth,
    posterHeight: posterLogicalHeight,
    imageAspectRatio
  })

  return new Promise((resolve, reject) => {
    try {
      const context = wx.createCanvasContext(canvasId)
      context.save()

      drawBackgroundLayer(context, posterLogicalWidth, posterLogicalHeight)
      drawMainImageBlock(context, imagePath, layout)
      drawVerticalPoem(context, poemTitle, poemLines, layout.textFrame)
      drawQrPlaceholderAndBrand(context, layout)

      context.restore()

      context.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId,
            width: posterLogicalWidth,
            height: posterLogicalHeight,
            destWidth: posterRealWidth,
            destHeight: posterRealHeight,
            success(result) {
              if (result && result.tempFilePath) {
                resolve({ tempFilePath: result.tempFilePath, layout })
              } else {
                reject(new Error('生成分享图失败'))
              }
            },
            fail(error) {
              reject(error)
            }
          },
          wx
        )
      })
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  renderPosterToTempFilePath
}
