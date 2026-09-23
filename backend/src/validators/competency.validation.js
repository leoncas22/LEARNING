import { z } from 'zod';

const competencyLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);

const levelConfigSchema = z.object({
  level: competencyLevelEnum,
  description: z.string().trim().optional(),
  minScore: z.coerce.number().int().min(0).max(100),
  maxScore: z.coerce.number().int().min(0).max(100),
});

export const listCompetenciesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const createCompetencySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Competency name must be at least 2 characters'),
    description: z.string().trim().optional(),
    category: z.string().trim().optional(),
    levels: z.array(levelConfigSchema).optional(),
  }),
});

export const updateCompetencySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
    levels: z.array(levelConfigSchema).optional(),
  }),
});

export const assignCourseCompetencySchema = z.object({
  body: z.object({
    competencyId: z.string().uuid('Valid competency ID is required'),
    targetLevel: competencyLevelEnum,
    weight: z.coerce.number().positive().optional().default(1.0),
  }),
});

