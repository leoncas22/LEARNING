const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parses page/limit/search/sort/order from req.query with sane bounds, so
 * no endpoint can be asked to return "all rows" by omission or a huge
 * ?limit=999999.
 */
export function parsePagination(query, { sortableFields = [], defaultSort = 'createdAt' } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const sort = sortableFields.includes(query.sort) ? query.sort : defaultSort;
  const order = query.order === 'asc' ? 'asc' : 'desc';

  return { page, limit, search, sort, order, skip: (page - 1) * limit };
}

export function buildPaginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export default { parsePagination, buildPaginationMeta };
