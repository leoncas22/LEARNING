import argon2 from 'argon2';
import authConfig from '../config/auth.config.js';

/**
 * Hash a plaintext password with Argon2id (the variant recommended for
 * password hashing — resistant to both GPU cracking and side-channel
 * attacks, unlike Argon2i/Argon2d alone).
 */
export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

/**
 * Verify a plaintext password against a stored Argon2 hash.
 * Never throws on mismatch — returns false instead, so callers can't
 * accidentally leak timing/error differences between "wrong password" and
 * "hashing error".
 */
export async function verifyPassword(hash, plainPassword) {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Validates password policy: minimum length + upper/lower/number.
 * Returns { valid: boolean, message?: string } instead of throwing, so
 * Zod (or a controller) can decide how to surface it.
 */
export function checkPasswordPolicy(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length < authConfig.password.minLength) {
    return {
      valid: false,
      message: `Password must be at least ${authConfig.password.minLength} characters long`,
    };
  }
  if (!authConfig.password.pattern.test(plainPassword)) {
    return {
      valid: false,
      message: 'Password must include at least one uppercase letter, one lowercase letter, and one number',
    };
  }
  return { valid: true };
}
