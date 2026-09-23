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
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
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

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    departmentId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
    employeeNumber: z.string().trim().min(1).optional(),
    role: z.enum(['EMPLOYEE', 'INSTRUCTOR']).default('EMPLOYEE'),
  }),
});
