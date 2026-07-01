const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

/**
 * Parses page/per_page/search/orderby/order query params into req.listQuery, WordPress-REST-API style.
 * `options.sortable` whitelists columns allowed in orderby (never trust raw client input in ORDER BY).
 * `options.defaultSort` is used when orderby is missing/invalid.
 */
export function pagination(options = {}) {
  const sortable = options.sortable ?? ['created_at'];
  const defaultSort = options.defaultSort ?? sortable[0];

  return function (req, _res, next) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.per_page, 10) || DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);
    const offset = (page - 1) * perPage;

    const orderby = sortable.includes(req.query.orderby) ? req.query.orderby : defaultSort;
    const order = String(req.query.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    req.listQuery = {
      page,
      perPage,
      offset,
      search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
      orderby,
      order,
    };

    next();
  };
}

/** Sets the WP-REST-style pagination headers on a list response. */
export function setPaginationHeaders(res, total, perPage) {
  res.set('X-WP-Total', String(total));
  res.set('X-WP-TotalPages', String(Math.max(Math.ceil(total / perPage), 1)));
}
