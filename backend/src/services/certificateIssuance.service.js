import prisma from '../config/db.js';
import { generateCertificateNumber } from '../utils/certNumber.js';
import { generateVerificationCode } from '../utils/verificationCode.js';
import { logActivity } from '../utils/activityLog.js';
import { checkCertificationEligibility } from './certification.service.js';

/**
 * Transactional certificate issuance.
 * Evaluates eligibility, guards against duplicates, creates record,
 * logs activity, and sends notification.
 */
export async function issueCertificate(userId, certificationId, client = prisma) {
  return client.$transaction(async (tx) => {
    // 1. Check eligibility
    const eligibility = await checkCertificationEligibility(certificationId, userId, tx);
    if (!eligibility.eligible) {
      return { success: false, reason: eligibility.reason };
    }

    const certification = await tx.certification.findUnique({
      where: { id: certificationId },
      include: { company: true },
    });

    if (!certification) {
      return { success: false, reason: 'Certification not found' };
    }

    // 2. Generate identifiers
    const certNumber = await generateCertificateNumber(tx);
    const vCode = await generateVerificationCode(tx);

    // 3. Calculate expiration date if applicable
    let expiresAt = null;
    if (certification.validityDays && certification.validityDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + certification.validityDays);
    }

    // 4. Create Certificate
    const certificate = await tx.certificate.create({
      data: {
        certificationId,
        userId,
        companyId: certification.companyId,
        certificateNumber: certNumber,
        verificationCode: vCode,
        status: 'ACTIVE',
        issuedAt: new Date(),
        expiresAt,
        quizScore: eligibility.qualifyingScore ?? null,
      },
      include: {
        certification: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // 5. Activity Log
    await logActivity(tx, {
      userId,
      companyId: certification.companyId,
      action: 'CERTIFICATE_ISSUED',
      entity: 'CERTIFICATE',
      entityId: certificate.id,
      metadata: {
        certificateNumber: certNumber,
        certificationTitle: certification.title,
        expiresAt,
      },
    });

    // 6. Notification
    await tx.notification.create({
      data: {
        userId,
        title: 'Certificate Earned!',
        message: `Congratulations! You have earned the certificate for "${certification.title}". (Certificate #${certNumber})`,
        type: 'CERTIFICATE_ISSUED',
      },
    });

    return {
      success: true,
      certificate,
    };
  });
}

/**
 * Checks all active certifications linked to a course and issues certificates
 * for any that this user is newly eligible for.
 * Called automatically when user completes a course or passes a quiz.
 */
export async function checkAndIssueCourseCertificates(userId, courseId, client = prisma) {
  const certifications = await client.certification.findMany({
    where: {
      courseId,
      status: 'ACTIVE',
    },
  });

  const results = [];
  for (const cert of certifications) {
    try {
      const res = await issueCertificate(userId, cert.id, client);
      if (res.success) {
        results.push(res.certificate);
      }
    } catch (err) {
      // Catch individual errors so one certification failure doesn't abort others
      console.error(`[CERT_ISSUANCE_ERROR] Failed to issue cert ${cert.id} for user ${userId}:`, err);
    }
  }

  return results;
}

export default {
  issueCertificate,
  checkAndIssueCourseCertificates,
};

