import { z } from 'zod';

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const safeUrl = z.string().refine(isValidUrl, 'Must be a valid HTTP or HTTPS URL');

const difficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const lessonTypeEnum = z.enum(['TEXT', 'VIDEO', 'PDF', 'DOCUMENT', 'LINK']);

export const listCoursesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    category: z.string().optional(),
    difficulty: difficultyEnum.optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Title is required'),
    description: z.string().trim().min(1, 'Description is required'),
    thumbnail: z.string().url().optional().or(z.literal('')),
    category: z.string().trim().min(1, 'Category is required'),
    difficulty: difficultyEnum,
    duration: z.coerce.number().int().positive().optional(),
    instructorId: z.string().uuid('Instructor is required'),
    passingScore: z.coerce.number().int().min(0).max(100).optional(),
  }),
});

export const updateCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().min(1).optional(),
    thumbnail: z.string().url().optional().or(z.literal('')),
    category: z.string().trim().min(1).optional(),
    difficulty: difficultyEnum.optional(),
    duration: z.coerce.number().int().positive().optional(),
    instructorId: z.string().uuid().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).optional(),
  }),
});

export const createModuleSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Module title is required'),
    description: z.string().trim().optional(),
  }),
});

export const updateModuleSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
  }),
});

export const reorderModulesSchema = z.object({
  body: z.object({
    order: z.array(z.string().uuid()).min(1, 'Module order list is required'),
  }),
});

const baseLessonFields = {
  title: z.string().trim().min(1, 'Lesson title is required'),
  description: z.string().trim().optional(),
  duration: z.coerce.number().int().positive().optional(),
};

export const createLessonSchema = z.object({
  body: z
    .object({
      ...baseLessonFields,
      type: lessonTypeEnum,
      content: z.string().optional(),
      videoUrl: safeUrl.optional(),
      fileUrl: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'TEXT' && !data.content) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Content is required for a TEXT lesson', path: ['content'] });
      }
      if (data.type === 'VIDEO' && !data.videoUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Video URL is required for a VIDEO lesson', path: ['videoUrl'] });
      }
      if ((data.type === 'PDF' || data.type === 'DOCUMENT') && !data.fileUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A file is required for this lesson type', path: ['fileUrl'] });
      }
      if (data.type === 'LINK') {
        if (!data.fileUrl) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'External URL is required for a LINK lesson', path: ['fileUrl'] });
        } else if (!isValidUrl(data.fileUrl)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid URL (http:// or https://)', path: ['fileUrl'] });
        }
      }
      if (data.type === 'VIDEO' && data.videoUrl && !isValidUrl(data.videoUrl)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid HTTP or HTTPS URL', path: ['videoUrl'] });
      }
    }),
});

export const updateLessonSchema = z.object({
  body: z
    .object({
      ...baseLessonFields,
      title: baseLessonFields.title.optional(),
      type: lessonTypeEnum.optional(),
      content: z.string().optional(),
      videoUrl: safeUrl.optional(),
      fileUrl: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.videoUrl && !isValidUrl(data.videoUrl)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid HTTP or HTTPS URL', path: ['videoUrl'] });
      }
      if (data.type === 'TEXT' && data.content !== undefined && !data.content.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Content is required for a TEXT lesson', path: ['content'] });
      }
      if (data.type === 'VIDEO' && !data.videoUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Video URL is required for a VIDEO lesson', path: ['videoUrl'] });
      }
      if (data.type === 'LINK') {
        if (!data.fileUrl) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'External URL is required for a LINK lesson', path: ['fileUrl'] });
        } else if (!isValidUrl(data.fileUrl)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid HTTP or HTTPS URL', path: ['fileUrl'] });
        }
      }
      if ((data.type === 'PDF' || data.type === 'DOCUMENT') && data.fileUrl !== undefined && !data.fileUrl.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A file is required for this lesson type', path: ['fileUrl'] });
      }
    }),
});

export const reorderLessonsSchema = z.object({
  body: z.object({
    order: z.array(z.string().uuid()).min(1, 'Lesson order list is required'),
  }),
});
