import crypto from 'crypto';
import authConfig from '../config/auth.config.js';

/**
 * Refresh, password-reset, and email-verification tokens are NOT JWTs.
 * They're high-entropy random strings, handed to the client once, and only
 * ever stored in the database as a hash (never in plain text — see
 * schema.prisma RefreshToken/PasswordResetToken/EmailVerificationToken).
 *
 * We use HMAC-SHA256 (keyed with JWT_REFRESH_SECRET) rather than Argon2 for
 * this hash: Argon2 is deliberately slow to resist brute-forcing a *guessed*
 * low-entropy password. These tokens are 256 bits of random data — nobody
 * is brute-forcing them — so a fast, deterministic hash is the right choice
 * (it also lets us look the token up by hash with a plain unique index,
 * which Argon2's per-call random salt would not allow).
 */

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex'); // 256 bits, returned to the client
}

export function hashToken(rawToken) {
  if (!authConfig.jwt.refreshSecret) {
    throw new Error('Refresh-token operations are unavailable: JWT_REFRESH_SECRET is not configured');
  }
  return crypto.createHmac('sha256', authConfig.jwt.refreshSecret).update(rawToken).digest('hex');
}

export function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}
