const PAGE_SIZE = 10

const parsePagination = (event = {}) => {
  const requestedPage = Number(event.page)
  const requestedLimit = Number(event.limit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(PAGE_SIZE, requestedLimit) : PAGE_SIZE
  return { page, limit, skip: (page - 1) * limit }
}

module.exports = { PAGE_SIZE, parsePagination }
