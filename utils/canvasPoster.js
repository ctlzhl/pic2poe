const BACKGROUND_TOP_COLOR = '#f7f1e7'
const BACKGROUND_BOTTOM_COLOR = '#ebddc7'
const POEM_TEXT_COLOR = '#3F3A3A'
const BORDER_COLOR = 'rgba(94, 82, 66, 0.18)'
const GOLD_DUST_LIGHT = 'rgba(192, 164, 124, 0.22)'
const GOLD_DUST_DARK = 'rgba(158, 130, 96, 0.26)'

const DEFAULT_POSTER_WIDTH = 600
const DEFAULT_POSTER_HEIGHT = 800
const QR_SCALE = 0.5

const OUTER_PADDING = 40
const CARD_RADIUS = 28
const HORIZONTAL_TEXT_IMAGE_GAP = 24
const VERTICAL_SECTION_GAP = 32
const VERTICAL_IMAGE_WIDTH_RATIO = 0.56

const BASE_USABLE_HEIGHT = DEFAULT_POSTER_HEIGHT - OUTER_PADDING * 2
const BASE_HORIZONTAL_TEXT_REGION_HEIGHT = BASE_USABLE_HEIGHT * 0.42

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

function createTextureRng(seed) {
  let value = seed % 2147483647
  if (value <= 0) {
    value += 2147483646
  }
  return () => (value = (value * 16807) % 2147483647) / 2147483647
}

function drawGoldDustTexture(context, posterWidth, posterHeight) {
  const rng = createTextureRng(Math.round(posterWidth * 97 + posterHeight * 131))
  const dotCount = Math.round((posterWidth * posterHeight) / 60)

  context.setFillStyle(GOLD_DUST_LIGHT)
  for (let i = 0; i < dotCount; i += 1) {
    const x = rng() * posterWidth
    const y = rng() * posterHeight
    const size = 1.6 + rng() * 3.0
    context.fillRect(x, y, size, size)
  }

  const accentCount = Math.round(dotCount * 0.35)
  context.setFillStyle(GOLD_DUST_DARK)
  for (let i = 0; i < accentCount; i += 1) {
    const x = rng() * posterWidth
    const y = rng() * posterHeight
    const size = 2 + rng() * 3.2
    context.fillRect(x, y, size, size)
  }
}

function drawBackgroundLayer(context, posterWidth, posterHeight) {
  const gradient = context.createLinearGradient(0, 0, 0, posterHeight)
  gradient.addColorStop(0, BACKGROUND_TOP_COLOR)
  gradient.addColorStop(1, BACKGROUND_BOTTOM_COLOR)

  context.setFillStyle(gradient)
  context.fillRect(0, 0, posterWidth, posterHeight)

  drawGoldDustTexture(context, posterWidth, posterHeight)

  context.setStrokeStyle(BORDER_COLOR)
  context.setLineWidth(1)
  drawRoundedRectangle(context, 18, 18, posterWidth - 36, posterHeight - 36, 18)
  context.stroke()
}

function measurePosterLayout(options = {}) {
  const posterWidth = options.posterWidth || DEFAULT_POSTER_WIDTH
  const fallbackPosterHeight = options.posterHeight || DEFAULT_POSTER_HEIGHT
  const imageAspectRatio = options.imageAspectRatio && options.imageAspectRatio > 0 ? options.imageAspectRatio : 3 / 4
  const forceVerticalLayout = options.forceVerticalLayout === true
  const verticalThreshold =
    typeof options.verticalThreshold === 'number' && options.verticalThreshold > 0 ? options.verticalThreshold : 0.95

  const layout = {
    mode: 'top-text',
    imageFrame: { x: 0, y: 0, width: 0, height: 0 },
    textFrame: { x: 0, y: 0, width: 0, height: 0 },
    qrFrame: { x: 0, y: 0, size: 0 }
  }

  const usableWidth = posterWidth - OUTER_PADDING * 2
  const safeAspectRatio = imageAspectRatio > 0 ? imageAspectRatio : 3 / 4
  let computedPosterHeight = fallbackPosterHeight

  const isVerticalImage = forceVerticalLayout || safeAspectRatio < verticalThreshold

  if (!isVerticalImage) {
    const textRegionHeight = BASE_HORIZONTAL_TEXT_REGION_HEIGHT
    const imageFrameWidth = usableWidth
    const imageFrameHeight = imageFrameWidth / safeAspectRatio
    const imageRegionTop = OUTER_PADDING + textRegionHeight + HORIZONTAL_TEXT_IMAGE_GAP

    layout.textFrame = {
      x: OUTER_PADDING,
      y: OUTER_PADDING,
      width: usableWidth,
      height: textRegionHeight
    }

    layout.imageFrame = {
      x: OUTER_PADDING,
      y: imageRegionTop,
      width: imageFrameWidth,
      height: imageFrameHeight
    }

    layout.mode = 'top-text'

    const baseQrSize = 120
    const baseCardPadding = 16
    const baseExtraCardHeightBelowQr = 0

    const qrSize = baseQrSize * QR_SCALE
    const cardPadding = baseCardPadding * QR_SCALE
    const extraCardHeightBelowQr = baseExtraCardHeightBelowQr * QR_SCALE

    layout.qrFrame = {
      x: layout.textFrame.x + layout.textFrame.width - qrSize - cardPadding,
      y: layout.textFrame.y + layout.textFrame.height - qrSize - cardPadding - extraCardHeightBelowQr,
      size: qrSize
    }

    computedPosterHeight = imageRegionTop + imageFrameHeight + OUTER_PADDING
  } else {
    const contentWidth = usableWidth
    const imageFrameWidth = (contentWidth - VERTICAL_SECTION_GAP) * VERTICAL_IMAGE_WIDTH_RATIO
    const imageFrameHeight = imageFrameWidth / safeAspectRatio
    const textWidth = contentWidth - imageFrameWidth - VERTICAL_SECTION_GAP

    layout.imageFrame = {
      x: OUTER_PADDING,
      y: OUTER_PADDING,
      width: imageFrameWidth,
      height: imageFrameHeight
    }

    layout.textFrame = {
      x: layout.imageFrame.x + layout.imageFrame.width + VERTICAL_SECTION_GAP,
      y: OUTER_PADDING,
      width: textWidth,
      height: imageFrameHeight
    }

    layout.mode = 'right-text'

    const baseQrCardPadding = 16
    const baseExtraCardHeightBelowQr = 0
    const baseQrSize = Math.min(110, layout.textFrame.width * 0.7)

    const qrSize = baseQrSize * QR_SCALE
    const qrCardPadding = baseQrCardPadding * QR_SCALE
    const extraCardHeightBelowQr = baseExtraCardHeightBelowQr * QR_SCALE

    layout.qrFrame = {
      x: layout.textFrame.x + layout.textFrame.width - qrSize - qrCardPadding,
      y: layout.textFrame.y + layout.textFrame.height - qrSize - qrCardPadding - extraCardHeightBelowQr,
      size: qrSize
    }

    computedPosterHeight = OUTER_PADDING * 2 + imageFrameHeight
  }

  layout.cardRadius = CARD_RADIUS
  layout.posterWidth = posterWidth
  layout.posterHeight = Math.max(Math.round(computedPosterHeight), OUTER_PADDING * 2 + CARD_RADIUS * 2)

  return layout
}

function drawMainImageBlock(context, imagePath, layout, imageMeta = {}) {
  const frame = layout.imageFrame
  if (!imagePath || !frame || !frame.width || !frame.height) {
    return
  }

  const shadowOffset = 12
  const originalImageWidth = Number(imageMeta.width)
  const originalImageHeight = Number(imageMeta.height)
  const hasValidImageMeta = originalImageWidth > 0 && originalImageHeight > 0
  const effectiveRadius = layout.cardRadius || CARD_RADIUS

  context.save()
  context.setFillStyle('rgba(0, 0, 0, 0.12)')
  drawRoundedRectangle(context, frame.x + shadowOffset, frame.y + shadowOffset, frame.width, frame.height, effectiveRadius + 6)
  context.fill()

  context.save()
  drawRoundedRectangle(context, frame.x, frame.y, frame.width, frame.height, effectiveRadius)
  context.clip()
  context.setFillStyle('#E5E5E5')
  context.fillRect(frame.x, frame.y, frame.width, frame.height)

  if (hasValidImageMeta) {
    const widthScale = frame.width / originalImageWidth
    const heightScale = frame.height / originalImageHeight
    const scale = Math.min(widthScale, heightScale)

    const displayWidth = originalImageWidth * scale
    const displayHeight = originalImageHeight * scale

    const drawX = frame.x + (frame.width - displayWidth) / 2
    const drawY = frame.y + (frame.height - displayHeight) / 2

    context.drawImage(imagePath, drawX, drawY, displayWidth, displayHeight)
  } else {
    console.warn('[poster] missing image meta, fallback to frame size:', JSON.stringify({ imageMeta, frame }))
    context.drawImage(imagePath, frame.x, frame.y, frame.width, frame.height)
  }

  context.restore()

  context.setStrokeStyle('rgba(255, 255, 255, 0.85)')
  context.setLineWidth(2)
  drawRoundedRectangle(context, frame.x, frame.y, frame.width, frame.height, effectiveRadius)
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
  context.setTextBaseline('top')

  const totalColumns = linesToRender.length + (poemTitle ? 1 : 0)
  if (totalColumns === 0) {
    context.restore()
    return
  }

  const maxAvailableWidth = textFrame.width
  const columnSpacing = Math.min(48, maxAvailableWidth / Math.max(totalColumns, 3))

  const titleCharacters = poemTitle ? String(poemTitle).split('') : []
  const lineCharacters = linesToRender.map((line) => String(line).split(''))
  const maxCharsPerColumn = Math.max(
    titleCharacters.length || 0,
    ...lineCharacters.map((characters) => characters.length || 0)
  )

  const characterSpacing = 36
  const blockHeight = Math.max(characterSpacing, (maxCharsPerColumn - 1) * characterSpacing)

  const safeBottomOffset = textFrame.height * 0.14
  let topY = textFrame.y + Math.max(0, (textFrame.height - blockHeight) / 2) - safeBottomOffset
  if (topY < textFrame.y) {
    topY = textFrame.y
  }

  const blockWidth = (totalColumns - 1) * columnSpacing
  const rightMostX = textFrame.x + textFrame.width / 2 + blockWidth / 2

  let currentColumnIndex = 0

  context.setFontSize(38)
  if (poemTitle) {
    const titleColumnX = rightMostX - currentColumnIndex * columnSpacing
    titleCharacters.forEach((character, index) => {
      const characterY = topY + index * characterSpacing
      context.fillText(character, titleColumnX, characterY)
    })
    currentColumnIndex += 1
  }

  context.setFontSize(32)
  linesToRender.forEach((lineText, lineIndex) => {
    const columnX = rightMostX - (currentColumnIndex + lineIndex) * columnSpacing
    const characters = String(lineText).split('')
    characters.forEach((character, index) => {
      const characterY = topY + index * characterSpacing
      context.fillText(character, columnX, characterY)
    })
  })

  context.restore()
}

function drawHorizontalPoem(context, poemTitle, poemLines, textFrame, { avoidQrOverlap = false } = {}) {
  const effectiveLines = Array.isArray(poemLines) ? poemLines : []
  const trimmedLines = effectiveLines
    .map((line) => (line || '').trim())
    .filter((line) => !!line)

  let linesToRender = trimmedLines.slice(0, 4)
  if (linesToRender.length >= 2) {
    const mergedLines = []
    const pairSeparator = '　'
    for (let index = 0; index < linesToRender.length; index += 2) {
      const first = linesToRender[index] || ''
      const second = linesToRender[index + 1] || ''
      const combined = second ? `${first}${pairSeparator}${second}`.trim() : first.trim()
      if (combined) {
        mergedLines.push(combined)
      }
    }
    if (mergedLines.length) {
      linesToRender = mergedLines.slice(0, 2)
    }
  }

  context.save()
  context.setFillStyle(POEM_TEXT_COLOR)
  context.setTextBaseline('top')
  context.setTextAlign('center')

  const centerX = textFrame.x + textFrame.width / 2

  const titleFontSize = 38
  const bodyFontSize = 32
  const lineHeight = 48
  const titleSpacing = 12

  const titleHeight = poemTitle ? titleFontSize + titleSpacing : 0
  const bodyHeight = linesToRender.length * lineHeight
  const totalHeight = titleHeight + bodyHeight

  let currentY = textFrame.y + Math.max(0, (textFrame.height - totalHeight) / 2)
  if (avoidQrOverlap) {
    currentY = Math.max(textFrame.y + 6, currentY - 24)
  }

  if (poemTitle) {
    context.setFontSize(titleFontSize)
    context.fillText(poemTitle, centerX, currentY)
    currentY += titleFontSize + titleSpacing
  }

  context.setFontSize(bodyFontSize)
  linesToRender.forEach((lineText) => {
    context.fillText(String(lineText), centerX, currentY)
    currentY += lineHeight
  })

  context.restore()
}

function drawQrPlaceholderAndBrand(context, layout) {
  const qrFrame = layout.qrFrame
  const baseCardPadding = 16
  const baseCornerRadius = 20

  const cardPadding = baseCardPadding * QR_SCALE
  const cornerRadius = baseCornerRadius * QR_SCALE

  context.save()

  context.setFillStyle('rgba(255, 255, 255, 0.9)')
  drawRoundedRectangle(
    context,
    qrFrame.x - cardPadding,
    qrFrame.y - cardPadding,
    qrFrame.size + cardPadding * 2,
    qrFrame.size + cardPadding * 2,
    cornerRadius
  )
  context.fill()

  const qrImageSrc = '/static/qr/poster-entry.png'
  context.setFillStyle('#E5E5E5')
  context.fillRect(qrFrame.x, qrFrame.y, qrFrame.size, qrFrame.size)
  context.drawImage(qrImageSrc, qrFrame.x, qrFrame.y, qrFrame.size, qrFrame.size)

  context.restore()
}

function renderPosterToTempFilePath(options) {
  const canvasId = options.canvasId || 'sharePosterCanvas'
  const posterWidth = options.posterWidth || DEFAULT_POSTER_WIDTH
  const posterHeight = options.posterHeight || DEFAULT_POSTER_HEIGHT

  const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null
  const pixelRatio = options.pixelRatio || (systemInfo && systemInfo.pixelRatio) || 2

  const posterLogicalWidth = posterWidth
  let posterLogicalHeight = posterHeight
  const posterRealWidth = posterLogicalWidth * pixelRatio
  let posterRealHeight = posterLogicalHeight * pixelRatio

  const layoutResolvedCallback = typeof options.onLayoutResolved === 'function' ? options.onLayoutResolved : null

  const imagePath = options.imagePath
  const poemTitle = options.poemTitle || ''
  const poemLines = options.poemLines || []
  const baseImageMeta = options.imageMeta || {}

  const resolveImageMeta = () =>
    new Promise((resolve) => {
      const width = Number(baseImageMeta.width)
      const height = Number(baseImageMeta.height)

      if (!imagePath) {
        if (width > 0 && height > 0) {
          resolve({ ...baseImageMeta, width, height })
        } else {
          resolve({ ...baseImageMeta })
        }
        return
      }

      wx.getImageInfo({
        src: imagePath,
        success(result) {
          resolve({
            ...baseImageMeta,
            width: result.width,
            height: result.height
          })
        },
        fail() {
          if (width > 0 && height > 0) {
            resolve({ ...baseImageMeta, width, height })
          } else {
            resolve({ ...baseImageMeta })
          }
        }
      })
    })

  return new Promise((outerResolve, outerReject) => {
    resolveImageMeta()
      .then((finalImageMeta) => {
        const imageWidth = finalImageMeta.width
        const imageHeight = finalImageMeta.height
        const baseWidth = Number(baseImageMeta.width)
        const baseHeight = Number(baseImageMeta.height)
        const aspectRatioHint = Number(
          baseImageMeta.aspectRatio || baseImageMeta.aspectRatioHint || finalImageMeta.aspectRatio || finalImageMeta.aspectRatioHint
        )
        const orientationHint = String(baseImageMeta.orientationHint || '').toLowerCase()
        const selectionPortraitFlag =
          typeof baseImageMeta.isPortrait === 'boolean'
            ? baseImageMeta.isPortrait
            : typeof finalImageMeta.isPortrait === 'boolean'
            ? finalImageMeta.isPortrait
            : null

        let imageAspectRatio = 3 / 4

        if (aspectRatioHint > 0) {
          imageAspectRatio = aspectRatioHint
        } else if (baseWidth > 0 && baseHeight > 0) {
          imageAspectRatio = baseWidth / baseHeight
        } else if (imageWidth && imageHeight && imageHeight > 0) {
          imageAspectRatio = imageWidth / imageHeight
        }

        const baseLooksPortrait = baseHeight > 0 && baseHeight >= baseWidth * 1.02
        const finalLooksPortrait = imageHeight > 0 && imageWidth > 0 && imageHeight >= imageWidth * 1.02

        let shouldForceVerticalLayout = false
        if (orientationHint === 'portrait' || selectionPortraitFlag === true) {
          shouldForceVerticalLayout = true
        } else if (orientationHint === 'landscape' || selectionPortraitFlag === false) {
          shouldForceVerticalLayout = false
        } else if (baseLooksPortrait || finalLooksPortrait) {
          shouldForceVerticalLayout = true
        }

        const layout = measurePosterLayout({
          posterWidth: posterLogicalWidth,
          posterHeight,
          imageAspectRatio,
          forceVerticalLayout: shouldForceVerticalLayout,
          verticalThreshold: 0.95
        })

        posterLogicalHeight = layout.posterHeight
        posterRealHeight = posterLogicalHeight * pixelRatio

        const synchronizeCanvas = layoutResolvedCallback ? Promise.resolve(layoutResolvedCallback(layout)) : Promise.resolve()

        synchronizeCanvas
          .then(() => {
            try {
              const context = wx.createCanvasContext(canvasId)
              context.save()

              drawBackgroundLayer(context, posterLogicalWidth, posterLogicalHeight)
              drawMainImageBlock(context, imagePath, layout, finalImageMeta)
              if (layout.mode === 'right-text') {
                drawVerticalPoem(context, poemTitle, poemLines, layout.textFrame)
              } else {
                drawHorizontalPoem(context, poemTitle, poemLines, layout.textFrame, { avoidQrOverlap: true })
              }
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
                        outerResolve({ tempFilePath: result.tempFilePath, layout })
                      } else {
                        outerReject(new Error('生成分享图失败'))
                      }
                    },
                    fail(error) {
                      outerReject(error)
                    }
                  },
                  wx
                )
              })
            } catch (error) {
              outerReject(error)
            }
          })
          .catch((error) => {
            outerReject(error)
          })
      })
      .catch((error) => {
        outerReject(error)
      })
  })
}

module.exports = {
  renderPosterToTempFilePath
}
