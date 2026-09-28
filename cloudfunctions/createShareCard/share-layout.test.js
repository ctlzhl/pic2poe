const assert = require('node:assert/strict')
const test = require('node:test')

const {
  landscapePoemLayout,
  portraitPoemLayout,
  editorialTypography,
  editorialLayoutFor,
  editorialSideBySideLayout,
  editorialStackedLayout,
  visualImageAspect
} = require('./share-layout')

test('横图诗卡的原图铺满成品宽度且保持比例', () => {
  const layout = landscapePoemLayout({ imageAspect: 16 / 9 })

  assert.equal(layout.canvas.width, 1440)
  assert.equal(layout.photo.left, 0)
  assert.equal(layout.photo.width, layout.canvas.width)
  assert.equal(layout.photo.top + layout.photo.height, layout.canvas.height)
  assert.equal(layout.photo.height, 810)
  assert.equal(layout.photo.fit, 'cover')
  assert.equal(layout.text.x, 720)
  assert.ok(layout.qr.top + layout.qr.size < layout.photo.top)
})

test('方图诗卡采用上下布局，原图铺满成品宽度', () => {
  assert.equal(editorialLayoutFor({ width: 1200, height: 1200 }).kind, 'stacked')
  const layout = landscapePoemLayout({ imageAspect: 1 })

  assert.equal(layout.photo.width, layout.canvas.width)
  assert.equal(layout.photo.height, 1440)
})

test('竖图诗卡的原图铺满成品高度且诗文居中于右侧', () => {
  const layout = portraitPoemLayout({ titleLineCount: 2, poemLineCount: 4, imageAspect: 0.75 })

  assert.deepEqual(layout.photo, { left: 0, top: 0, width: 1350, height: 1800, fit: 'cover', position: 'centre' })
  assert.equal(layout.canvas.width, 1990)
  assert.equal(layout.canvas.height, layout.photo.height)
  assert.equal(layout.text.x, 1670)
  assert.equal(layout.text.anchor, 'middle')
  assert.ok(layout.text.bodyY > layout.text.titleY)
  assert.ok(layout.text.bodyY + 3 * 90 < layout.qr.top)
  assert.ok(layout.qr.left >= layout.photo.width)
})

test('EXIF 旋转后的可见宽高用于判断版式和计算照片比例', () => {
  assert.equal(visualImageAspect({ width: 1600, height: 900, orientation: 6 }), 900 / 1600)
  assert.equal(editorialLayoutFor({ width: 1600, height: 900, orientation: 6 }).kind, 'side-by-side')
})

test('图评与文案的文字版式不预留类型标签行', () => {
  assert.deepEqual(editorialTypography(), {
    title: { fontSize: 64, lineHeight: 84 },
    body: { fontSize: 42, lineHeight: 64 },
    tags: { fontSize: 30, lineHeight: 40 }
  })
})

test('竖图图评与文案的原图铺满成品高度，文字和二维码只在右侧', () => {
  const layout = editorialSideBySideLayout({ imageAspect: 0.99, titleLineCount: 3, bodyLineCount: 6 })

  assert.equal(layout.photo.top, 0)
  assert.equal(layout.photo.height, layout.canvas.height)
  assert.equal(layout.photo.width, 1782)
  assert.equal(layout.photo.fit, 'cover')
  assert.ok(layout.text.x + 12 * 42 <= layout.canvas.width - 64)
  assert.ok(layout.text.tagsY < layout.qr.top)
  assert.ok(layout.qr.left >= layout.photo.width)
  assert.ok(layout.qr.left + layout.qr.size < layout.canvas.width)
})

test('横图与方图图评、文案的原图铺满成品宽度，文字从照片下方开始', () => {
  for (const imageAspect of [16 / 9, 1]) {
    const layout = editorialStackedLayout({ imageAspect, titleLineCount: 2, bodyLineCount: 4 })

    assert.equal(layout.canvas.width, 1440)
    assert.equal(layout.photo.left, 0)
    assert.equal(layout.photo.top, 0)
    assert.equal(layout.photo.width, layout.canvas.width)
    assert.equal(layout.photo.height, Math.round(1440 / imageAspect))
    assert.equal(layout.photo.fit, 'cover')
    assert.ok(layout.text.titleY > layout.photo.height)
    assert.ok(layout.text.tagsY < layout.qr.top)
    assert.ok(layout.qr.top + layout.qr.size < layout.canvas.height)
  }
})
