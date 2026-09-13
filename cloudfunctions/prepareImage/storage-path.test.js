const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('原图使用可由生命周期规则匹配的统一 original 前缀', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

  assert.match(
    source,
    /const originalPath = `original\/\$\{openid\}\/\$\{assetId\}\.\$\{sourceExtension\(metadata\.format\)\}`/
  )
})
