/**
 * The access token lives only in memory (a module-level variable), not in
 * localStorage or a cookie. It's lost on a full page reload by design —
 * AuthContext re-establishes it by calling /api/auth/me (which rides the
 * HttpOnly refresh cookie) on app start. This is what Phase 3 spec §30
 * calls for: "Access Token → memory/state, Refresh Token → HttpOnly Secure
 * Cookie".
 */
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
