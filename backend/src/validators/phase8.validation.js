import { z } from 'zod';

const idParam = z.object({ id: z.string().uuid('A valid announcement or notification id is required') }).strict();
const pagination = {
  page: z.coerce.number().int().positive().max(100000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
};

export const listAnnouncementsSchema = z.object({
  query: z.object({ ...pagination, status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional() }).strict(),
});

const announcementFields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(1, 'Content is required').max(100000),
  departmentId: z.string().uuid('Department id must be a valid UUID').nullable().optional(),
  audience: z.enum(['COMPANY', 'DEPARTMENT']).optional(),
};

export const createAnnouncementSchema = z.object({
  body: z.object(announcementFields).strict().superRefine((value, ctx) => {
    if (value.audience === 'DEPARTMENT' && !value.departmentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Department is required for department announcements' });
    }
    if (value.audience === 'COMPANY' && value.departmentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Company-wide announcements cannot target a department' });
    }
  }),
});

export const updateAnnouncementSchema = z.object({
  params: idParam,
  body: z.object({
    title: announcementFields.title.optional(),
    content: announcementFields.content.optional(),
    departmentId: announcementFields.departmentId,
    audience: announcementFields.audience,
  }).strict().superRefine((value, ctx) => {
    if (!Object.keys(value).length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one announcement field is required' });
    if (value.audience === 'DEPARTMENT' && !value.departmentId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Department is required for department announcements' });
    if (value.audience === 'COMPANY' && value.departmentId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Company-wide announcements cannot target a department' });
  }),
});

export const announcementIdSchema = z.object({ params: idParam });

export const listNotificationsSchema = z.object({
  query: z.object({ ...pagination, unread: z.enum(['true', 'false']).optional() }).strict(),
});

export const notificationIdSchema = z.object({ params: idParam });

export const listAuditLogsSchema = z.object({
  query: z.object({
    ...pagination,
    action: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    createdAfter: z.coerce.date().optional(),
    createdBefore: z.coerce.date().optional(),
  }).strict().superRefine((value, ctx) => {
    if (value.createdAfter && value.createdBefore && value.createdAfter > value.createdBefore) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['createdAfter'], message: 'createdAfter must be before createdBefore' });
    }
  }),
});
