import { Router } from 'express';
import * as courseController from '../controllers/course.controller.js';
import * as moduleController from '../controllers/module.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listCoursesSchema,
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  reorderModulesSchema,
} from '../validators/course.validation.js';
import * as courseCompetencyController from '../controllers/courseCompetency.controller.js';
import { assignCourseCompetencySchema } from '../validators/competency.validation.js';

const router = Router();

// Course content is a Company Admin / Instructor surface — employees use
// /api/me/courses instead, which enforces enrollment-based access rather
// than role-based access.
router.use(authenticate, authorize('COMPANY_ADMIN', 'INSTRUCTOR'));

router.get('/', validate(listCoursesSchema), courseController.listCourses);
router.post('/', authorize('COMPANY_ADMIN'), validate(createCourseSchema), courseController.createCourse);

router.get('/:id', courseController.getCourse);
router.patch('/:id', validate(updateCourseSchema), courseController.updateCourse);
router.get('/:id/publish-readiness', courseController.getPublishReadiness);
router.post('/:id/publish', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), courseController.publishCourse);
router.post('/:id/archive', authorize('COMPANY_ADMIN', 'INSTRUCTOR'), courseController.archiveCourse);

router.post('/:courseId/modules', validate(createModuleSchema), moduleController.createModule);
router.post('/:courseId/modules/reorder', validate(reorderModulesSchema), moduleController.reorderModules);

// Phase 6 — Course Competencies
router.get('/:courseId/competencies', courseCompetencyController.listCourseCompetencies);
router.post('/:courseId/competencies', validate(assignCourseCompetencySchema), courseCompetencyController.addCourseCompetency);
router.delete('/:courseId/competencies/:competencyId', courseCompetencyController.removeCourseCompetency);

export default router;
