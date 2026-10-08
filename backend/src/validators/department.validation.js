import { z } from 'zod';

export const departmentIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100, 'Department name is too long'),
    description: z.string().trim().max(500, 'Description is too long').optional(),
  }).strict(),
});
