import crypto from 'crypto';
import prisma from '../config/db.js';

/**
 * Generates a cryptographically secure, unpredictable, unique verification code.
 * Format: 32 alphanumeric uppercase characters formatted in groups, e.g.
 * V-XXXX-XXXX-XXXX-XXXX or a 24-byte hex string.
 * Completely opaque: exposes no userId, companyId, database ID, or timestamp.
 */
export async function generateVerificationCode(tx = prisma) {
  let unique = false;
  let code = '';

  while (!unique) {
    const raw = crypto.randomBytes(16).toString('hex').toUpperCase();
    // Format: VRF-XXXX-XXXX-XXXX-XXXX for clean display & typing
    code = `VRF-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;

    const existing = await tx.certificate.findUnique({
      where: { verificationCode: code },
    });
    if (!existing) {
      unique = true;
    }
  }

  return code;
}

export default generateVerificationCode;

