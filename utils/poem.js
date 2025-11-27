const DEFAULT_POEM_TITLE = 'AI 诗作'

const derivePoemObject = (poemValue, fallbackTitle = DEFAULT_POEM_TITLE) => {
  if (!poemValue) {
    return { title: fallbackTitle, body: '' }
  }

  if (typeof poemValue === 'string') {
    const normalizedText = poemValue.replace(/\r\n/g, '\n').trim()
    if (!normalizedText) {
      return { title: fallbackTitle, body: '' }
    }

    const lines = normalizedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      return { title: fallbackTitle, body: '' }
    }

    const [firstLine, ...restLines] = lines
    return {
      title: firstLine || fallbackTitle,
      body: restLines.join('\n')
    }
  }

  if (typeof poemValue === 'object' && !Array.isArray(poemValue)) {
    return {
      title: poemValue.title || fallbackTitle,
      body: poemValue.body || ''
    }
  }

  return { title: fallbackTitle, body: '' }
}

const normalizePoemResult = (resultData, { fallbackTitle } = {}) => {
  if (!resultData || typeof resultData !== 'object') {
    return null
  }

  const poemFallbackTitle = fallbackTitle || DEFAULT_POEM_TITLE
  const poem = derivePoemObject(resultData.poem, poemFallbackTitle)
  const rawImageUrl = typeof resultData.imageUrl === 'string' ? resultData.imageUrl : ''
  const displayImageUrl = resultData.displayImageUrl || rawImageUrl
  const originalImageUrl = resultData.originalImageUrl || rawImageUrl

  return {
    ...resultData,
    poem,
    displayImageUrl,
    originalImageUrl,
    imageUrl: displayImageUrl || originalImageUrl || rawImageUrl
  }
}

module.exports = {
  DEFAULT_POEM_TITLE,
  derivePoemObject,
  normalizePoemResult
}
