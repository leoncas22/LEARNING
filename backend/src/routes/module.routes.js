import { Router } from 'express';
import * as moduleController from '../controllers/module.controller.js';
import * as lessonController from '../controllers/lesson.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateModuleSchema, createLessonSchema, reorderLessonsSchema } from '../validators/course.validation.js';

const router = Router();

router.use(authenticate, authorize('COMPANY_ADMIN', 'INSTRUCTOR'));

router.patch('/:id', validate(updateModuleSchema), moduleController.updateModule);
router.delete('/:id', moduleController.deleteModule);

// Nested under the owning module, per spec's documented API shape:
// POST /api/modules/:moduleId/lessons, POST /api/modules/:moduleId/lessons/reorder
router.post('/:moduleId/lessons', validate(createLessonSchema), lessonController.createLesson);
router.post('/:moduleId/lessons/reorder', validate(reorderLessonsSchema), lessonController.reorderLessons);

export default router;
