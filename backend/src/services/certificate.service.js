import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { logActivity } from '../utils/activityLog.js';

/**
 * Dynamically evaluates effective status considering expiration date.
 */
export function getEffectiveStatus(cert) {
  if (cert.status === 'REVOKED') return 'REVOKED';
  if (cert.expiresAt && new Date(cert.expiresAt) <= new Date()) {
    return 'EXPIRED';
  }
  return cert.status; // ACTIVE
}

export async function listCertificates(actingUser, query = {}) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['issuedAt', 'expiresAt', 'certificateNumber', 'createdAt'],
    defaultSort: 'issuedAt',
  });

  const where = {
    companyId: actingUser.companyId,
  };

  if (query.certificationId) {
    where.certificationId = query.certificationId;
  }
  if (query.departmentId) {
    where.user = { departmentId: query.departmentId };
  }

  // Handle status filter considering computed expiration
  const now = new Date();
  if (query.status === 'REVOKED') {
    where.status = 'REVOKED';
  } else if (query.status === 'EXPIRED') {
    where.OR = [
      { status: 'EXPIRED' },
      { status: 'ACTIVE', expiresAt: { lte: now } },
    ];
  } else if (query.status === 'ACTIVE') {
    where.status = 'ACTIVE';
    where.AND = [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ];
  }

  if (search) {
    where.OR = [
      { certificateNumber: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { certification: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (actingUser.role === 'INSTRUCTOR') {
    where.AND = [
      ...(where.AND || []),
      {
        certification: {
          OR: [
            { course: { instructorId: actingUser.id } },
            {
              requirements: {
                some: {
                  quiz: { course: { instructorId: actingUser.id } },
                },
              },
            },
          ],
        },
      },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        certification: { select: { id: true, title: true } },
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const shaped = items.map((cert) => ({
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    status: getEffectiveStatus(cert),
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    quizScore: cert.quizScore,
    user: cert.user,
    certification: cert.certification,
  }));

  return {
    data: shaped,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
}

export async function getCertificate(actingUser, id) {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      certification: {
        select: {
          id: true,
          title: true,
          description: true,
          validityDays: true,
          course: { select: { id: true, title: true, instructorId: true } },
          requirements: {
            select: {
              quiz: {
                select: {
                  course: { select: { instructorId: true } },
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  });

  if (!cert) {
    throw new AppError('Certificate not found', 404, 'NOT_FOUND');
  }

  // Access check:
  // Employee can only view their own certificate
  if (actingUser.role === 'EMPLOYEE' && cert.userId !== actingUser.id) {
    throw new AppError('Certificate not found', 404, 'NOT_FOUND');
  }
  // HR / Admin must belong to the same company
  if (actingUser.role !== 'EMPLOYEE') {
    assertSameCompany(cert.companyId, actingUser);
  }
  if (actingUser.role === 'INSTRUCTOR') {
    const ownsCourse = cert.certification.course?.instructorId === actingUser.id;
    const ownsQuizCourse = cert.certification.requirements.some(
      (requirement) => requirement.quiz?.course?.instructorId === actingUser.id,
    );
    if (!ownsCourse && !ownsQuizCourse) {
      throw new AppError('Certificate not found', 404, 'NOT_FOUND');
    }
  }

  return {
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    status: getEffectiveStatus(cert),
    rawStatus: cert.status,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    revokedAt: cert.revokedAt,
    revocationNote: cert.revocationNote,
    quizScore: cert.quizScore,
    user: cert.user,
    certification: cert.certification,
    company: {
      name: cert.company.name,
      logo: cert.company.logo,
    },
  };
}

export async function listMyCertificates(actingUser) {
  const items = await prisma.certificate.findMany({
    where: { userId: actingUser.id },
    orderBy: { issuedAt: 'desc' },
    include: {
      certification: {
        select: {
          id: true,
          title: true,
          description: true,
          course: { select: { id: true, title: true } },
        },
      },
      company: {
        select: { name: true },
      },
    },
  });

  return items.map((c) => ({
    id: c.id,
    certificateNumber: c.certificateNumber,
    verificationCode: c.verificationCode,
    status: getEffectiveStatus(c),
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    quizScore: c.quizScore,
    certification: c.certification,
    companyName: c.company.name,
  }));
}

export async function revokeCertificate(actingUser, id, reason = '') {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      certification: { select: { title: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!cert) {
    throw new AppError('Certificate not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(cert.companyId, actingUser);

  if (cert.status === 'REVOKED') {
    throw new AppError('Certificate is already revoked', 400, 'ALREADY_REVOKED');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const revoked = await tx.certificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationNote: reason.trim() || null,
      },
    });

    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'CERTIFICATE_REVOKED',
      entity: 'CERTIFICATE',
      entityId: id,
      metadata: {
        certificateNumber: cert.certificateNumber,
        reason: reason.trim() || null,
        recipientUserId: cert.userId,
      },
    });

    await tx.notification.create({
      data: {
        userId: cert.userId,
        title: 'Certificate Revoked',
        message: `Your certificate #${cert.certificateNumber} for "${cert.certification.title}" has been revoked.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'CERTIFICATE_REVOKED',
      },
    });

    return revoked;
  });

  return updated;
}

/**
 * Public certificate verification.
 * Does NOT require authentication.
 * Returns safe subset of information:
 * - status (ACTIVE, EXPIRED, REVOKED)
 * - certificate title / certification name
 * - employee display name
 * - company name
 * - issued date
 * - expiration date
 * - verification code & certificate number
 * NEVER exposes emails, user IDs, internal company IDs, quiz details.
 */
export async function verifyPublicCertificate(verificationCode) {
  if (!verificationCode || typeof verificationCode !== 'string') {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const cleanCode = verificationCode.trim().toUpperCase();

  const cert = await prisma.certificate.findUnique({
    where: { verificationCode: cleanCode },
    include: {
      certification: { select: { title: true } },
      user: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (!cert) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const effectiveStatus = getEffectiveStatus(cert);

  // Safe subset
  return {
    valid: effectiveStatus === 'ACTIVE',
    status: effectiveStatus,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    certificationTitle: cert.certification.title,
    recipientName: cert.user.name,
    companyName: cert.company.name,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    revokedAt: cert.revokedAt,
  };
}

export default {
  getEffectiveStatus,
  listCertificates,
  getCertificate,
  listMyCertificates,
  revokeCertificate,
  verifyPublicCertificate,
};

