import env from './env.js';

export const authConfig = {
  jwt: {
    accessSecret: env.jwt.accessSecret,
    refreshSecret: env.jwt.refreshSecret, // used to HMAC-hash opaque refresh tokens, not to sign a JWT
    accessExpiresIn: env.jwt.accessExpiresIn, // e.g. '15m'
    accessExpiresInSeconds: parseDurationToSeconds(env.jwt.accessExpiresIn),
  },

  refreshToken: {
    expiresInSeconds: parseDurationToSeconds(env.jwt.refreshExpiresIn || '7d'),
    cookieName: 'lms_refresh_token',
  },

  passwordResetToken: {
    expiresInSeconds: 30 * 60, // 30 minutes
  },

  emailVerificationToken: {
    expiresInSeconds: 24 * 60 * 60, // 24 hours
  },

  password: {
    minLength: 8,
    // At least one uppercase, one lowercase, one number.
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
  },

  cookie: {
    secure: (process.env.COOKIE_SECURE || 'false') === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    httpOnly: true,
    path: '/api/auth', // refresh cookie is only ever sent to auth endpoints
  },
};

/**
 * Parses a short duration string like "15m", "7d", "30s" into seconds.
 * Supports s|m|h|d. Falls back to treating a bare number as seconds.
 */
function parseDurationToSeconds(value) {
  if (!value) return 0;
  const match = /^(\d+)([smhd])?$/.exec(String(value).trim());
  if (!match) return Number(value) || 0;
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[unit];
}

export default authConfig;
