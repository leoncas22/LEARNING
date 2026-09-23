import { z } from 'zod';

const requirementSchema = z.object({
  minProgressPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  quizId: z.string().uuid().optional().nullable().or(z.literal('')),
  minQuizScore: z.coerce.number().int().min(0).max(100).optional().nullable(),
});

export const listCertificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    courseId: z.string().uuid().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const createCertificationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Certification title must be at least 2 characters'),
    description: z.string().trim().optional().nullable(),
    courseId: z.string().uuid().optional().nullable().or(z.literal('')),
    validityDays: z.coerce.number().int().min(0).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    requirements: requirementSchema.optional(),
  }),
});

export const updateCertificationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional().nullable(),
    courseId: z.string().uuid().optional().nullable().or(z.literal('')),
    validityDays: z.coerce.number().int().min(0).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    requirements: requirementSchema.optional(),
  }),
});

export const listCertificatesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
    certificationId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const revokeCertificateSchema = z.object({
  body: z.object({
    reason: z.string().trim().optional(),
  }),
});

