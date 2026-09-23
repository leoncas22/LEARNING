import { z } from 'zod';

export const assignTrainingSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Course is required'),
    employeeIds: z.array(z.string().uuid()).min(1, 'Select at least one employee'),
    dueDate: z.coerce.date().optional(),
  }),
});

export const listTrainingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    courseId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']).optional(),
  }),
});
