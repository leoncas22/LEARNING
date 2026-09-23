import { z } from 'zod';

const questionTypeEnum = z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'SHORT_ANSWER']);

export const listQuizzesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    courseId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
});

export const createQuizSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Course is required'),
    lessonId: z.string().uuid().optional(),
    title: z.string().trim().min(2, 'Title is required'),
    description: z.string().trim().optional(),
    instructions: z.string().trim().optional(),
    timeLimit: z.coerce.number().int().positive().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).optional(),
    attemptLimit: z.coerce.number().int().min(1).max(20).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showCorrectAnswers: z.boolean().optional(),
  }),
});

export const updateQuizSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    instructions: z.string().trim().optional(),
    timeLimit: z.coerce.number().int().positive().nullable().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).optional(),
    attemptLimit: z.coerce.number().int().min(1).max(20).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    showCorrectAnswers: z.boolean().optional(),
  }),
});

const optionInputSchema = z.object({
  optionText: z.string().trim().min(1, 'Option text is required'),
  isCorrect: z.boolean().optional().default(false),
});

export const createQuestionSchema = z.object({
  body: z
    .object({
      type: questionTypeEnum,
      question: z.string().trim().min(1, 'Question text is required'),
      points: z.coerce.number().int().positive('Points must be greater than 0'),
      explanation: z.string().trim().optional(),
      options: z.array(optionInputSchema).optional(),
      acceptedAnswers: z.array(z.string().trim().min(1)).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'MULTIPLE_CHOICE' || data.type === 'MULTIPLE_ANSWER') {
        if (!data.options || data.options.length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least 2 options are required', path: ['options'] });
        } else if (!data.options.some((o) => o.isCorrect)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one correct option is required', path: ['options'] });
        }
        if (data.type === 'MULTIPLE_CHOICE' && data.options?.filter((o) => o.isCorrect).length > 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Single choice questions can only have one correct option', path: ['options'] });
        }
      }
      if (data.type === 'TRUE_FALSE') {
        if (!data.options || data.options.length !== 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'True/False requires exactly 2 options', path: ['options'] });
        } else if (data.options.filter((o) => o.isCorrect).length !== 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly one option must be correct', path: ['options'] });
        }
      }
      if (data.type === 'SHORT_ANSWER' && (!data.acceptedAnswers || data.acceptedAnswers.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one accepted answer is required', path: ['acceptedAnswers'] });
      }
    }),
});

export const updateQuestionSchema = z.object({
  body: z.object({
    type: questionTypeEnum.optional(),
    question: z.string().trim().min(1).optional(),
    points: z.coerce.number().int().positive().optional(),
    explanation: z.string().trim().optional(),
    options: z.array(optionInputSchema).optional(),
    acceptedAnswers: z.array(z.string().trim().min(1)).optional(),
  }),
});

export const reorderQuestionsSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string().uuid(),
          order: z.coerce.number().int().positive(),
        })
      )
      .min(1),
  }),
});

export const saveAnswerSchema = z.object({
  body: z.object({
    selectedOptionIds: z.array(z.string().uuid()).optional(),
    answerText: z.string().optional(),
  }),
});
