import { Router } from 'express';
import * as lessonController from '../controllers/lesson.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateLessonSchema } from '../validators/course.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/lessons/:id — open to any authenticated role; getLessonForViewing
// branches internally: staff get the company/instructor check, an EMPLOYEE
// gets the enrollment-ownership check. See lesson.service.js.
router.get('/:id', lessonController.getLesson);

router.patch('/:id', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), validate(updateLessonSchema), lessonController.updateLesson);
router.delete('/:id', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), lessonController.deleteLesson);

// Lesson completion is the learner's own action — gated by enrollment
// ownership inside the service, not by role, so any authenticated user
// with a real enrollment can complete their own lesson.
router.post('/:id/complete', lessonController.completeLesson);

export default router;
