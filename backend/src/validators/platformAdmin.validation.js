import { z } from 'zod';
import { checkPasswordPolicy } from '../utils/password.js';

const id = z.string().uuid();
const email = z.string().trim().email('Invalid email address').transform((value) => value.toLowerCase());
const passwordField = z.string().superRefine((value, ctx) => {
  const result = checkPasswordPolicy(value);
  if (!result.valid) ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
});
const role = z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE']);
const status = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const companyStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(150);
const employeeNumber = z.string().trim().max(100).optional().nullable();

export const platformUserListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    role: role.optional(),
    status: status.optional(),
    companyId: id.optional(),
  }),
});

export const platformCompanyListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().max(120).optional(),
    status: companyStatus.optional(),
  }),
});

export const createPlatformUserSchema = z.object({
  body: z.object({
    name,
    email,
    password: passwordField,
    role,
    companyId: id.optional().nullable(),
    departmentId: id.optional().nullable(),
    positionId: id.optional().nullable(),
    employeeNumber,
    status: status.optional(),
  }).strict(),
});

export const updatePlatformUserSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    name: name.optional(),
    email: email.optional(),
    password: passwordField.optional(),
    role: role.optional(),
    companyId: id.optional().nullable(),
    departmentId: id.optional().nullable(),
    positionId: id.optional().nullable(),
    employeeNumber,
    status: status.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const platformUserIdSchema = z.object({ params: z.object({ id }) });
export const updateCompanyStatusSchema = z.object({
  params: z.object({ id }),
  body: z.object({ status: companyStatus }).strict(),
});
