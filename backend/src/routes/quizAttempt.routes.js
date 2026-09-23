import { Router } from 'express';
import * as attemptController from '../controllers/quizAttempt.controller.js';
import * as resultsController from '../controllers/quizResults.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { saveAnswerSchema } from '../validators/quiz.validation.js';

const router = Router();
router.use(authenticate);

// Every handler below enforces attempt.userId === req.user.id inside the
// service (see quizAttempt.service.js) — there is no role check here
// because ownership IS the authorization for a learner's own attempt.
router.get('/:attemptId', attemptController.getAttempt);
router.put('/:attemptId/answers/:questionId', validate(saveAnswerSchema), attemptController.saveAnswer);
router.post('/:attemptId/submit', attemptController.submitAttempt);
router.get('/:attemptId/result', attemptController.getAttemptResult);

// Staff review of a specific attempt (spec Module 36's "HR Attempt
// Detail"). Deviates from the spec's literal single GET .../result path
// (documented in docs/phase-5.md) to keep the employee's own gated result
// and staff's always-full detail as two distinct, independently
// authorized handlers rather than one branching on role.
router.get('/:attemptId/staff-detail', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), resultsController.getAttemptDetail);

export default router;
