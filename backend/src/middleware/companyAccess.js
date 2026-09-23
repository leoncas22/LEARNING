import { AppError, asyncHandler } from './errorHandler.js';

/**
 * companyAccess(resolveCompanyId) — for routes that load a single resource
 * by id (e.g. GET /api/employees/:id). `resolveCompanyId` is an async
 * function (req) => companyId | null, responsible for looking up which
 * tenant the requested resource actually belongs to (e.g. by its own
 * :id param). This middleware then compares that to req.user.companyId.
 *
 * We return 404 (not 403) on a cross-tenant hit: confirming "this resource
 * exists, you just can't see it" is itself an information leak across
 * tenant boundaries. SUPER_ADMIN bypasses the check by design.
 *
 * IMPORTANT: this never trusts a companyId supplied by the client (body,
 * query, or params) — only req.user.companyId, which authenticate()
 * populated from the verified session.
 */
export function companyAccess(resolveCompanyId) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const resourceCompanyId = await resolveCompanyId(req);
    if (!resourceCompanyId || resourceCompanyId !== req.user.companyId) {
      throw new AppError('Resource not found', 404, 'NOT_FOUND');
    }
    next();
  });
}

/**
 * Non-middleware helper for services/controllers that already have the
 * resource loaded and just need the same ownership check inline.
 */
export function assertSameCompany(resourceCompanyId, user) {
  if (user.role === 'SUPER_ADMIN') return;
  if (!resourceCompanyId || resourceCompanyId !== user.companyId) {
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
  }
}

export default companyAccess;
