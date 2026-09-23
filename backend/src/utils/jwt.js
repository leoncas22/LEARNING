import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.config.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Access token payload is intentionally minimal — just enough to identify
 * the caller before we re-verify against the database. Never put anything
 * sensitive (email, name) in here: JWTs are base64, not encrypted, and this
 * token may end up in logs, error reports, or browser memory.
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role, // role NAME (string), e.g. "EMPLOYEE" — resolved server-side at issue time
      companyId: user.companyId ?? null,
    },
    authConfig.jwt.accessSecret,
    { expiresIn: authConfig.jwt.accessExpiresIn }
  );
}

/**
 * Verifies and decodes an access token. Throws AppError(401) on any
 * failure (expired, malformed, wrong signature) so callers don't need to
 * distinguish jsonwebtoken's various error subclasses.
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, authConfig.jwt.accessSecret);
  } catch {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
  }
}
