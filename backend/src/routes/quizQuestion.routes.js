import { Router } from 'express';
import * as questionController from '../controllers/quizQuestion.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateQuestionSchema } from '../validators/quiz.validation.js';

const router = Router();

router.use(authenticate, authorize('COMPANY_ADMIN', 'INSTRUCTOR'));

router.patch('/:id', validate(updateQuestionSchema), questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

export default router;
