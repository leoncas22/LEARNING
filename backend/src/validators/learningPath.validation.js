import { z } from 'zod';

const id = z.string().uuid();
const paramsId = z.object({ id }).strict();
const pagination = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
};

export const listLearningPathsSchema = z.object({ query: z.object({ ...pagination, status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(), search: z.string().trim().optional() }).strict() });
export const learningPathIdSchema = z.object({ params: paramsId });
export const createLearningPathSchema = z.object({ body: z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(100000).optional() }).strict() });
export const updateLearningPathSchema = z.object({ params: paramsId, body: z.object({ title: z.string().trim().min(2).max(200).optional(), description: z.string().trim().max(100000).nullable().optional() }).strict() });
export const addPathCourseSchema = z.object({ params: paramsId, body: z.object({ courseId: id, required: z.boolean().optional() }).strict() });
export const removePathCourseSchema = z.object({ params: z.object({ id, courseId: id }).strict() });
export const reorderPathCoursesSchema = z.object({ params: paramsId, body: z.object({ courseIds: z.array(id).min(1) }).strict() });
export const assignLearningPathSchema = z.object({
  params: paramsId,
  body: z.object({
    employeeIds: z.array(id).optional(),
    departmentId: id.optional(),
    positionId: id.optional(),
    dueDate: z.coerce.date().optional(),
  }).strict().superRefine((value, ctx) => {
    const targetCount = Number(Boolean(value.employeeIds?.length)) + Number(Boolean(value.departmentId)) + Number(Boolean(value.positionId));
    if (targetCount !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select exactly one assignment target', path: ['employeeIds'] });
  }),
});
export const listPathProgressSchema = z.object({ params: paramsId, query: z.object({ ...pagination }).strict() });
