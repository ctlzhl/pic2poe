const assert = require('node:assert/strict')
const test = require('node:test')

const { landscapePoemLayout, portraitPoemLayout, editorialTypography } = require('./share-layout')

test('横版诗卡的标题与正文以画布中心轴对齐', () => {
  const layout = landscapePoemLayout()

  assert.deepEqual(layout.text, { x: 720, anchor: 'middle', titleY: 172, bodyY: 300 })
  assert.deepEqual(layout.photo, { left: 0, top: 780, width: 1440, height: 1020, fit: 'contain', position: 'centre' })
})

test('竖版诗卡完整保留原图比例，正文在右侧留白中居中', () => {
  const layout = portraitPoemLayout({ titleLineCount: 1, poemLineCount: 4, imageAspect: 0.75 })

  assert.deepEqual(layout.photo, { left: 0, top: 234, width: 1000, height: 1333, fit: 'contain', position: 'centre' })
  assert.equal(layout.text.x, 1220)
  assert.equal(layout.text.anchor, 'middle')
  assert.ok(layout.text.titleY > 400)
  assert.ok(layout.text.bodyY > layout.text.titleY)
  assert.ok(layout.text.bodyY < 1120)
})

test('不同竖构图比例都会完整显示且不超出画布', () => {
  const shortTitle = portraitPoemLayout({ titleLineCount: 1, poemLineCount: 4, imageAspect: 0.75 })
  const longTitle = portraitPoemLayout({ titleLineCount: 2, poemLineCount: 4, imageAspect: 0.75 })
  const phonePortrait = portraitPoemLayout({ titleLineCount: 1, poemLineCount: 4, imageAspect: 9 / 16 })

  assert.ok(longTitle.text.titleY < shortTitle.text.titleY)
  assert.equal(phonePortrait.photo.height, 1704)
  assert.ok(Math.abs(phonePortrait.photo.width / phonePortrait.photo.height - 9 / 16) < 0.002)
  assert.equal(longTitle.qr.top, 1580)
  assert.equal(longTitle.qr.left, 1145)
})

test('图评与文案分享卡使用更易阅读的正文排版', () => {
  assert.deepEqual(editorialTypography(), {
    label: { fontSize: 30, lineHeight: 40 },
    title: { fontSize: 64, lineHeight: 84 },
    body: { fontSize: 42, lineHeight: 64 },
    tags: { fontSize: 30, lineHeight: 40 }
  })
})
