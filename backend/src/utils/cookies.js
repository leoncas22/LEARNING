import authConfig from '../config/auth.config.js';

/**
 * The refresh token lives ONLY in an HttpOnly cookie, scoped to /api/auth so
 * it isn't attached to every API request — just the handful of endpoints
 * that need it (refresh, logout).
 */
export function setRefreshTokenCookie(res, rawToken) {
  res.cookie(authConfig.refreshToken.cookieName, rawToken, {
    httpOnly: authConfig.cookie.httpOnly,
    secure: authConfig.cookie.secure,
    sameSite: authConfig.cookie.sameSite,
    path: authConfig.cookie.path,
    maxAge: authConfig.refreshToken.expiresInSeconds * 1000,
  });
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(authConfig.refreshToken.cookieName, {
    httpOnly: authConfig.cookie.httpOnly,
    secure: authConfig.cookie.secure,
    sameSite: authConfig.cookie.sameSite,
    path: authConfig.cookie.path,
  });
}

export function getRefreshTokenFromRequest(req) {
  return req.cookies?.[authConfig.refreshToken.cookieName] ?? null;
}
