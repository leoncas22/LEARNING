import { z } from 'zod';
import { checkPasswordPolicy } from '../utils/password.js';

// Shared password rule: Zod handles "is it a string" shape validation;
// checkPasswordPolicy (same function the service re-uses) enforces the
// actual policy so the rule is defined in exactly one place.
const passwordField = z.string().superRefine((value, ctx) => {
  const result = checkPasswordPolicy(value);
  if (!result.valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
  }
});

export const loginSchema = z.object({
  body: z.object({
    // `email` is the existing database login column. `username` is accepted
    // as the public API name without introducing a second identity system.
    username: z.string().trim().min(1, 'Username is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(1, 'Password is required'),
  }).refine((body) => Boolean(body.username || body.email), {
    message: 'Username is required',
    path: ['username'],
  }),
});

export const registerCompanySchema = z.object({
  body: z.object({
    companyName: z.string().trim().min(2, 'Company name is required'),
    adminName: z.string().trim().min(2, 'Admin name is required'),
    email: z.string().email('Invalid email address'),
    password: passwordField,
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      password: passwordField,
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const managedUserFields = {
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  employeeNumber: z.string().trim().min(1).optional().nullable(),
  role: z.enum(['COMPANY_ADMIN', 'EMPLOYEE', 'INSTRUCTOR']),
};

export const createEmployeeSchema = z.object({
  body: z.object({
    ...managedUserFields,
    password: passwordField,
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    name: managedUserFields.name.optional(),
    email: managedUserFields.email.optional(),
    departmentId: managedUserFields.departmentId,
    positionId: managedUserFields.positionId,
    employeeNumber: managedUserFields.employeeNumber,
    role: managedUserFields.role.optional(),
    password: passwordField.optional(),
  }).refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const employeeStatusSchema = z.object({
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }),
});

export const employeeListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    role: z.enum(['COMPANY_ADMIN', 'EMPLOYEE', 'INSTRUCTOR']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    departmentId: z.string().uuid().optional(),
  }),
});

export const employeeIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const employeeOptionsSchema = z.object({ query: z.object({}) });
