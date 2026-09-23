import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { logActivity } from '../utils/activityLog.js';
import { getTotalLessonsForCourse, getCompletedLessonCount, toPercentage } from './progress.service.js';

export async function listCertifications(actingUser, query = {}) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['title', 'status', 'createdAt', 'updatedAt'],
    defaultSort: 'createdAt',
  });

  const where = {
    companyId: actingUser.companyId,
  };

  if (query.status) {
    where.status = query.status;
  }
  if (query.courseId) {
    where.courseId = query.courseId;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Instructors may only see certifications attached to their own courses
  // (directly or through a required quiz). Company admins retain company scope.
  if (actingUser.role === 'INSTRUCTOR') {
    where.AND = [
      ...(where.AND || []),
      {
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
    ];
  }

  const [total, items] = await Promise.all([
    prisma.certification.count({ where }),
    prisma.certification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        course: {
          select: { id: true, title: true, status: true, instructorId: true },
        },
        requirements: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                passingScore: true,
                course: { select: { instructorId: true } },
              },
            },
          },
        },
        _count: {
          select: { certificates: true },
        },
      },
    }),
  ]);

  const shaped = items.map((cert) => ({
    id: cert.id,
    title: cert.title,
    description: cert.description,
    validityDays: cert.validityDays,
    status: cert.status,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    course: cert.course,
    requirements: cert.requirements[0] || null,
    certificatesIssued: cert._count.certificates,
  }));

  return {
    data: shaped,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
}

export async function getCertification(actingUser, id) {
  const certification = await prisma.certification.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          status: true,
          passingScore: true,
          instructorId: true,
        },
      },
      requirements: {
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passingScore: true,
              course: { select: { instructorId: true } },
            },
          },
        },
      },
      certificates: {
        orderBy: { issuedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!certification) {
    throw new AppError('Certification not found', 404, 'NOT_FOUND');
  }

  assertSameCompany(certification.companyId, actingUser);

  if (actingUser.role === 'INSTRUCTOR') {
    const ownsCourse = certification.course?.instructorId === actingUser.id;
    const ownsQuizCourse = certification.requirements.some(
      (requirement) => requirement.quiz?.course?.instructorId === actingUser.id,
    );
    if (!ownsCourse && !ownsQuizCourse) {
      throw new AppError('Certification not found', 404, 'NOT_FOUND');
    }
  }

  // Simple statistics
  const certs = certification.certificates;
  const now = new Date();
  const activeCount = certs.filter((c) => c.status === 'ACTIVE' && (!c.expiresAt || c.expiresAt > now)).length;
  const expiredCount = certs.filter((c) => c.status === 'EXPIRED' || (c.status === 'ACTIVE' && c.expiresAt && c.expiresAt <= now)).length;
  const revokedCount = certs.filter((c) => c.status === 'REVOKED').length;

  return {
    ...certification,
    requirement: certification.requirements[0] || null,
    stats: {
      totalIssued: certs.length,
      active: activeCount,
      expired: expiredCount,
      revoked: revokedCount,
    },
  };
}

export async function createCertification(actingUser, data) {
  // If courseId provided, verify tenant ownership
  if (data.courseId) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course || course.companyId !== actingUser.companyId) {
      throw new AppError('Course not found in your company', 404, 'NOT_FOUND');
    }
  }

  // If quizId provided in requirements, verify quiz
  const reqData = data.requirements || {};
  if (reqData.quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: reqData.quizId },
      include: { course: true },
    });
    if (!quiz || quiz.course.companyId !== actingUser.companyId) {
      throw new AppError('Quiz not found in your company', 404, 'NOT_FOUND');
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const cert = await tx.certification.create({
      data: {
        companyId: actingUser.companyId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        courseId: data.courseId || null,
        validityDays: data.validityDays || null,
        status: data.status || 'DRAFT',
        requirements: {
          create: {
            minProgressPct: reqData.minProgressPct ?? 100,
            quizId: reqData.quizId || null,
            minQuizScore: reqData.minQuizScore ?? null,
          },
        },
      },
      include: {
        requirements: true,
        course: { select: { id: true, title: true } },
      },
    });

    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'CERTIFICATION_CREATED',
      entity: 'CERTIFICATION',
      entityId: cert.id,
      metadata: { title: cert.title },
    });

    return cert;
  });

  return created;
}

export async function updateCertification(actingUser, id, data) {
  const existing = await prisma.certification.findUnique({
    where: { id },
    include: { requirements: true },
  });

  if (!existing) {
    throw new AppError('Certification not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(existing.companyId, actingUser);

  if (data.courseId && data.courseId !== existing.courseId) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course || course.companyId !== actingUser.companyId) {
      throw new AppError('Course not found in your company', 404, 'NOT_FOUND');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update requirement if provided
    if (data.requirements) {
      const req = data.requirements;
      if (existing.requirements.length > 0) {
        await tx.certificationRequirement.update({
          where: { id: existing.requirements[0].id },
          data: {
            ...(req.minProgressPct !== undefined && { minProgressPct: req.minProgressPct }),
            ...(req.quizId !== undefined && { quizId: req.quizId || null }),
            ...(req.minQuizScore !== undefined && { minQuizScore: req.minQuizScore }),
          },
        });
      } else {
        await tx.certificationRequirement.create({
          data: {
            certificationId: id,
            minProgressPct: req.minProgressPct ?? 100,
            quizId: req.quizId || null,
            minQuizScore: req.minQuizScore ?? null,
          },
        });
      }
    }

    const cert = await tx.certification.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.courseId !== undefined && { courseId: data.courseId || null }),
        ...(data.validityDays !== undefined && { validityDays: data.validityDays || null }),
        ...(data.status && { status: data.status }),
      },
      include: {
        requirements: {
          include: { quiz: { select: { id: true, title: true } } },
        },
        course: { select: { id: true, title: true } },
      },
    });

    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'CERTIFICATION_UPDATED',
      entity: 'CERTIFICATION',
      entityId: id,
      metadata: { title: cert.title },
    });

    return cert;
  });

  return updated;
}

export async function archiveCertification(actingUser, id) {
  const existing = await prisma.certification.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Certification not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(existing.companyId, actingUser);

  const archived = await prisma.certification.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'CERTIFICATION_ARCHIVED',
    entity: 'CERTIFICATION',
    entityId: id,
    metadata: { title: archived.title },
  });

  return archived;
}

/**
 * Checks if a specific employee satisfies all requirements for a certification.
 * Source of truth: backend evaluation of enrollment progress + quiz results.
 */
export async function checkCertificationEligibility(certificationId, userId, client = prisma) {
  const cert = await client.certification.findUnique({
    where: { id: certificationId },
    include: {
      requirements: {
        include: { quiz: true },
      },
    },
  });

  if (!cert || cert.status !== 'ACTIVE') {
    return { eligible: false, reason: 'Certification is not active' };
  }

  // Eligibility is always tenant-bound and employee-bound. Never allow a
  // caller-supplied userId to evaluate another company or non-employee user.
  const employee = await client.user.findUnique({
    where: { id: userId },
    select: {
      companyId: true,
      deletedAt: true,
      role: { select: { name: true } },
    },
  });
  if (!employee || employee.deletedAt || employee.companyId !== cert.companyId || employee.role.name !== 'EMPLOYEE') {
    return { eligible: false, reason: 'Employee is not eligible for this certification' };
  }

  // Prevent duplicate active certificates before evaluating optional requirements.
  const now = new Date();
  const activeCert = await client.certificate.findFirst({
    where: {
      userId,
      certificationId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
  });
  if (activeCert) {
    return {
      eligible: false,
      reason: 'Employee already holds an active certificate for this certification',
      existingCertificateId: activeCert.id,
      existingCertificateNumber: activeCert.certificateNumber,
    };
  }

  const req = cert.requirements[0];
  if (!req) {
    return { eligible: true };
  }

  // 1. Check Course Requirement
  if (cert.courseId) {
    const enrollment = await client.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: cert.courseId } },
    });

    if (!enrollment || enrollment.status === 'CANCELLED') {
      return { eligible: false, reason: 'Employee is not enrolled in the required course' };
    }

    const minProgress = req.minProgressPct ?? 100;
    const [totalLessons, completedLessons] = await Promise.all([
      getTotalLessonsForCourse(cert.courseId, client),
      getCompletedLessonCount(cert.courseId, userId, client),
    ]);

    const progressPct = toPercentage(completedLessons, totalLessons);
    if (progressPct < minProgress) {
      return {
        eligible: false,
        reason: `Course progress (${progressPct}%) is below required ${minProgress}%`,
        currentProgress: progressPct,
        requiredProgress: minProgress,
      };
    }
  }

  // 2. Check Quiz Requirement
  let qualifyingScore = null;
  if (req.quizId) {
    const attempts = await client.quizAttempt.findMany({
      where: {
        userId,
        quizId: req.quizId,
        status: { in: ['GRADED', 'PASSED'] },
      },
      orderBy: { score: 'desc' },
    });

    if (attempts.length === 0) {
      return { eligible: false, reason: 'Employee has not completed the required quiz' };
    }

    const bestAttempt = attempts[0];
    const minScore = req.minQuizScore ?? (req.quiz?.passingScore || 80);

    if (bestAttempt.score === null || bestAttempt.score < minScore) {
      return {
        eligible: false,
        reason: `Best quiz score (${bestAttempt.score || 0}%) is below required ${minScore}%`,
        currentScore: bestAttempt.score,
        requiredScore: minScore,
      };
    }

    qualifyingScore = bestAttempt.score;
  }

  return {
    eligible: true,
    qualifyingScore,
  };
}

export default {
  listCertifications,
  getCertification,
  createCertification,
  updateCertification,
  archiveCertification,
  checkCertificationEligibility,
};

