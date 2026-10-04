const PAGE_SIZE = 10

const parsePagination = (event = {}) => {
  const requestedPage = Number(event.page)
  const requestedLimit = Number(event.limit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(PAGE_SIZE, requestedLimit) : PAGE_SIZE
  return { page, limit, skip: (page - 1) * limit }
}

const readAssetsByIds = async (db, assetIds, openid) => {
  const ids = [...new Set(assetIds.filter(Boolean))]
  if (!ids.length) return new Map()
  try {
    const result = await db.collection('imageAssets').where({
      _id: db.command.in(ids)
    }).get()
    return new Map((result.data || [])
      .filter((asset) => asset.userId === openid && ids.includes(asset._id))
      .map((asset) => [asset._id, asset]))
  } catch (error) {
    return new Map()
  }
}

module.exports = { PAGE_SIZE, parsePagination, readAssetsByIds }
