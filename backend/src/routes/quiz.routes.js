import { Router } from 'express';
import * as quizController from '../controllers/quiz.controller.js';
import * as questionController from '../controllers/quizQuestion.controller.js';
import * as attemptController from '../controllers/quizAttempt.controller.js';
import * as resultsController from '../controllers/quizResults.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listQuizzesSchema,
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  reorderQuestionsSchema,
} from '../validators/quiz.validation.js';

const router = Router();
router.use(authenticate);

// Quiz management is a Company Admin / Instructor surface. Employees never
// hit /api/quizzes/* at all — they use /api/me/quizzes and
// /api/quiz-attempts/*, which are scoped by enrollment, not role.
router.get('/', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), validate(listQuizzesSchema), quizController.listQuizzes);
router.post('/', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), validate(createQuizSchema), quizController.createQuiz);

router.get('/:id', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), quizController.getQuiz);
router.patch('/:id', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), validate(updateQuizSchema), quizController.updateQuiz);
router.get('/:id/publish-readiness', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), quizController.getPublishReadiness);
router.post('/:id/publish', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), quizController.publishQuiz);
router.post('/:id/archive', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), quizController.archiveQuiz);
router.get('/:quizId/results', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), resultsController.getQuizResults);

router.post(
  '/:quizId/questions',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  validate(createQuestionSchema),
  questionController.createQuestion
);
router.post(
  '/:quizId/questions/reorder',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  validate(reorderQuestionsSchema),
  questionController.reorderQuestions
);

// Employee-facing: start (or resume) an attempt. No role restriction here
// — access is governed entirely by enrollment + quiz.status, checked
// inside quizAttempt.service.js, exactly like lesson completion in Phase 4.
router.post('/:quizId/attempts', attemptController.startAttempt);

export default router;
