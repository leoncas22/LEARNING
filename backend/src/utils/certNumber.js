import prisma from '../config/db.js';

/**
 * Generates a human-readable, unique, stable certificate number.
 * Format: CERT-{YYYY}-{6-digit sequential / company sequence}
 * e.g., CERT-2026-000001
 * Uses database transaction or count for uniqueness assurance.
 */
export async function generateCertificateNumber(tx = prisma) {
  const currentYear = new Date().getFullYear();
  const prefix = `CERT-${currentYear}-`;

  // Count existing certificates for this year to get next sequence
  const count = await tx.certificate.count({
    where: {
      certificateNumber: {
        startsWith: prefix,
      },
    },
  });

  let seq = count + 1;
  let candidate = `${prefix}${String(seq).padStart(6, '0')}`;

  // Collision safety loop
  while (await tx.certificate.findUnique({ where: { certificateNumber: candidate } })) {
    seq += 1;
    candidate = `${prefix}${String(seq).padStart(6, '0')}`;
  }

  return candidate;
}

export default generateCertificateNumber;

