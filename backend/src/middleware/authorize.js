import { AppError } from './errorHandler.js';

/**
 * authorize("COMPANY_ADMIN", "INSTRUCTOR") — must run AFTER authenticate,
 * since it reads req.user.role which authenticate populates from a
 * verified, freshly-reloaded database record (never from req.body).
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Programmer error: authorize() used without authenticate() first.
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
    }
    next();
  };
}

export default authorize;
