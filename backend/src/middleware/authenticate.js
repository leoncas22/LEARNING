import prisma from '../config/db.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from './errorHandler.js';
import env from '../config/env.js';

/**
 * Populates req.user from a verified access token.
 *
 * Deliberately re-reads the user from the database on every request rather
 * than trusting the JWT payload for anything beyond "which user is this" —
 * a role change, a suspension, or a company suspension must take effect
 * immediately, not after the 15-minute access token happens to expire.
 *
 * req.user is the ONLY source of identity/role/companyId for every
 * downstream handler. Nothing in req.body is ever trusted for this.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  if (!env.jwt.accessSecret) {
    throw new AppError('Authentication is unavailable: JWT_ACCESS_SECRET is not configured', 503, 'AUTH_CONFIGURATION_ERROR');
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const payload = verifyAccessToken(token); // throws 401 on invalid/expired

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      companyId: true,
      departmentId: true,
      deletedAt: true,
      role: { select: { name: true } },
      company: { select: { id: true, status: true, securityVersion: true } },
    },
  });

  if (!user || user.deletedAt) {
    throw new AppError('Account no longer exists', 401, 'UNAUTHORIZED');
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 401, 'ACCOUNT_INACTIVE');
  }
  // A company-scoped user loses access immediately when the tenant is
  // inactive or suspended, even if the access token has not expired.
  if (user.company && user.company.status !== 'ACTIVE' && user.role.name !== 'SUPER_ADMIN') {
    throw new AppError('Company account is not active', 401, 'COMPANY_NOT_ACTIVE');
  }
  if (user.company && user.role.name !== 'SUPER_ADMIN') {
    const issuedCompanyEpoch = payload.companySecurityVersion;
    const currentCompanyEpoch = user.company.securityVersion;
    if (!Number.isInteger(issuedCompanyEpoch) || issuedCompanyEpoch !== currentCompanyEpoch) {
      throw new AppError('Access token is no longer valid', 401, 'INVALID_ACCESS_TOKEN');
    }
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    companyId: user.companyId,
    departmentId: user.departmentId,
  };

  next();
});

export default authenticate;
