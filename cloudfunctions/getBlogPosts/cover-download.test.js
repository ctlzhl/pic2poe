const assert = require('node:assert/strict')
const test = require('node:test')

const loadDownload = () => {
  try { return require('./cover-download').downloadCover } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') return undefined
    throw error
  }
}

test('只从博客允许的 HTTPS 域名下载真实图片', async () => {
  const downloadCover = loadDownload()
  assert.equal(typeof downloadCover, 'function')
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
  const response = {
    ok: true, status: 200,
    headers: new Map([['content-type', 'image/jpeg'], ['content-length', String(jpeg.length)]]),
    arrayBuffer: async () => jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength)
  }
  const result = await downloadCover('https://shengxiluo.me/cover.jpg', { fetchImpl: async () => response })
  assert.deepEqual(result, { bytes: jpeg, extension: 'jpg' })
  await assert.rejects(() => downloadCover('http://shengxiluo.me/a.jpg', { fetchImpl: async () => response }))
  await assert.rejects(() => downloadCover('https://127.0.0.1/a.jpg', { fetchImpl: async () => response }))
})

test('拒绝伪装图片和重定向到非允许域名', async () => {
  const downloadCover = loadDownload()
  assert.equal(typeof downloadCover, 'function')
  const html = Buffer.from('<html>not image</html>')
  await assert.rejects(() => downloadCover('https://shengxiluo.me/a.jpg', {
    fetchImpl: async () => ({
      ok: true, status: 200, headers: new Map([['content-type', 'image/jpeg']]),
      arrayBuffer: async () => html.buffer.slice(html.byteOffset, html.byteOffset + html.byteLength)
    })
  }))
  await assert.rejects(() => downloadCover('https://shengxiluo.me/a.jpg', {
    fetchImpl: async () => ({ status: 302, headers: new Map([['location', 'https://127.0.0.1/private']]) })
  }))
})
