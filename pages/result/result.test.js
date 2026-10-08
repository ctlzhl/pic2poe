const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const PAGE_PATH = path.join(__dirname, 'result.js')

function loadPageDefinition() {
  const originalPage = global.Page
  let definition
  global.Page = (options) => {
    definition = options
  }
  delete require.cache[require.resolve(PAGE_PATH)]
  require(PAGE_PATH)
  if (originalPage === undefined) delete global.Page
  else global.Page = originalPage
  return definition
}

function createPage(definition, data = {}) {
  const page = {
    data: { ...definition.data, ...data },
    setData(update) {
      Object.assign(this.data, update)
    }
  }

  Object.entries(definition).forEach(([name, value]) => {
    if (typeof value === 'function') page[name] = value.bind(page)
  })
  return page
}

test('点击保存分享会直接打开已就绪图片的原生分享菜单', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    shareImageUrl: 'https://example.com/share-card.jpg'
  })
  page.shareImageTempPath = '/tmp/share-card.jpg'
  const originalWx = global.wx
  let shownPath = ''
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showShareImageMenu({ path, success }) {
      shownPath = path
      success()
    }
  }

  try {
    await page.openNativeShareMenu()
    assert.equal(shownPath, '/tmp/share-card.jpg')
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('竖图预览限制高度且不拉伸，点按可查看完整原图', () => {
  const page = createPage(loadPageDefinition(), { work: { imageUrl: 'https://example.com/photo.jpg' } })
  const originalWx = global.wx
  let preview
  global.wx = { previewImage(options) { preview = options } }
  try {
    page.onPhotoLoad({ detail: { width: 900, height: 1600 } })
    assert.equal(page.data.photoWidth, 360)
    assert.equal(page.data.photoHeight, 640)
    page.previewPhoto()
    assert.deepEqual(preview, { current: 'https://example.com/photo.jpg', urls: ['https://example.com/photo.jpg'] })
    page.onPhotoLoad({ detail: { width: 1600, height: 900 } })
    assert.equal(page.data.photoWidth, 686)
    assert.equal(page.data.photoHeight, 386)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('自己的结果页在分享凭证就绪前不开放好友和朋友圈入口', () => {
  const definition = loadPageDefinition()
  const page = createPage(definition)
  page.loadWork = () => {}
  const originalWx = global.wx
  let hiddenOptions
  let shown = false
  global.wx = {
    hideShareMenu(value) { hiddenOptions = value },
    showShareMenu() { shown = true }
  }

  try {
    page.onLoad({ workId: 'work-1' })
    assert.deepEqual(hiddenOptions, { menus: ['shareAppMessage', 'shareTimeline'] })
    assert.equal(shown, false)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('损坏的小程序码场景参数显示失效提示而不使页面崩溃', () => {
  const page = createPage(loadPageDefinition())
  const previousWx = global.wx
  global.wx = { hideShareMenu() {} }
  try {
    assert.doesNotThrow(() => page.onLoad({ scene: '%broken' }))
    assert.equal(page.data.hasError, true)
    assert.equal(page.data.loading, false)
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
  }
})

test('分享图生成成功后开放分享入口并静默预下载图片', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, { workId: 'work-1' })
  const originalWx = global.wx
  let shownOptions
  let downloadCount = 0
  global.wx = {
    cloud: {
      callFunction({ success }) {
        success({ result: { ok: true, data: {
          shareToken: 'share-token',
          shareImageUrl: 'https://example.com/share-card.jpg',
          shareTitle: '照片有话说'
        } } })
      }
    },
    showShareMenu(value) { shownOptions = value },
    downloadFile({ success }) {
      downloadCount += 1
      success({ statusCode: 200, tempFilePath: '/tmp/share-card.jpg' })
    }
  }

  try {
    await page.prepareShareCard()
    await page.getShareImageTempPath()
    assert.deepEqual(shownOptions, {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    assert.equal(downloadCount, 1)
    assert.equal(page.shareImageTempPath, '/tmp/share-card.jpg')
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('预下载未完成时重复读取只发起一次下载', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, { shareImageUrl: 'https://example.com/share-card.jpg' })
  const originalWx = global.wx
  let completeDownload
  let downloadCount = 0
  global.wx = {
    downloadFile({ success }) {
      downloadCount += 1
      completeDownload = () => success({ statusCode: 200, tempFilePath: '/tmp/share-card.jpg' })
    }
  }

  try {
    const first = page.getShareImageTempPath()
    const second = page.getShareImageTempPath()
    assert.equal(downloadCount, 1)
    completeDownload()
    assert.equal(await first, '/tmp/share-card.jpg')
    assert.equal(await second, '/tmp/share-card.jpg')
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('连续点击保存分享只打开一次原生菜单', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, { shareImageUrl: 'https://example.com/share-card.jpg' })
  page.shareImageTempPath = '/tmp/share-card.jpg'
  const originalWx = global.wx
  let completeMenu
  let menuCount = 0
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showShareImageMenu({ success }) {
      menuCount += 1
      completeMenu = success
    }
  }

  try {
    const first = page.openNativeShareMenu()
    const second = page.openNativeShareMenu()
    await Promise.resolve()
    assert.equal(menuCount, 1)
    completeMenu()
    await Promise.all([first, second])
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('原生图片分享菜单调用失败时提示在真机预览中重试', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    shareImageUrl: 'https://example.com/share-card.jpg'
  })
  page.shareImageTempPath = '/tmp/share-card.jpg'
  const originalWx = global.wx
  const originalConsoleError = console.error
  let toastTitle = ''
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showShareImageMenu({ fail }) {
      fail({ errMsg: 'showShareImageMenu:fail not supported in devtools' })
    },
    showToast({ title }) {
      toastTitle = title
    }
  }

  try {
    console.error = () => {}
    await page.openNativeShareMenu()
    assert.equal(toastTitle, '图片分享暂不可用，请在真机预览中重试。')
  } finally {
    console.error = originalConsoleError
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})

test('分享图预生成未完成时首次点击会等待并直接打开菜单', async () => {
  const definition = loadPageDefinition()
  const page = createPage(definition, {
    workId: 'work-1',
    shareImageUrl: '',
    shareLoading: true
  })
  let finishGeneration
  page.shareCardPromise = new Promise((resolve) => {
    finishGeneration = () => {
      page.setData({ shareImageUrl: 'https://example.com/share-card.jpg' })
      page.shareImageTempPath = '/tmp/share-card.jpg'
      resolve('https://example.com/share-card.jpg')
    }
  })

  const originalWx = global.wx
  let shownPath = ''
  let toastCount = 0
  global.wx = {
    showLoading() {},
    hideLoading() {},
    showToast() {
      toastCount += 1
    },
    showShareImageMenu({ path, success }) {
      shownPath = path
      success()
    }
  }

  try {
    const opening = page.openNativeShareMenu()
    await Promise.resolve()
    assert.equal(shownPath, '')

    finishGeneration()
    await opening

    assert.equal(shownPath, '/tmp/share-card.jpg')
    assert.equal(toastCount, 0)
  } finally {
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
})
