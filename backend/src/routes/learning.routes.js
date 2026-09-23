import { Router } from 'express';
import * as learningController from '../controllers/learning.controller.js';
import * as attemptController from '../controllers/quizAttempt.controller.js';
import * as certificateController from '../controllers/certificate.controller.js';
import * as competencyController from '../controllers/competency.controller.js';
import * as learningPathController from '../controllers/learningPath.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Any authenticated user can query their own learning — access to a
// specific course's content still requires an actual enrollment (checked
// in learning.service.js), so this is safe to leave role-open.
router.use(authenticate);

router.get('/courses', learningController.listMyCourses);
router.get('/courses/:id', learningController.getMyCourse);
router.get('/learning-summary', learningController.getMyLearningSummary);
router.get('/learning-paths', learningPathController.myPaths);
router.get('/learning-paths/:id', learningPathController.myPath);

// Phase 5
router.get('/quizzes', attemptController.listMyQuizzes);
router.get('/quiz-history', attemptController.getMyQuizHistory);

// Phase 6 — Certificates & Competencies (Employee Self-Service)
router.get('/certificates', certificateController.listMyCertificates);
router.get('/certificates/:id', certificateController.getCertificate);
router.get('/competencies', competencyController.getMyCompetencies);
router.get('/competencies/:id', competencyController.getMyCompetencyDetail);

export default router;
