import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';
import courseRoutes from './course.routes.js';
import moduleRoutes from './module.routes.js';
import lessonRoutes from './lesson.routes.js';
import trainingRoutes from './training.routes.js';
import learningRoutes from './learning.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import uploadRoutes from './upload.routes.js';
import quizRoutes from './quiz.routes.js';
import quizQuestionRoutes from './quizQuestion.routes.js';
import quizAttemptRoutes from './quizAttempt.routes.js';
import certificationRoutes from './certification.routes.js';
import certificateRoutes from './certificate.routes.js';
import competencyRoutes from './competency.routes.js';
import reportingRoutes from './reporting.routes.js';
import notificationRoutes from './notification.routes.js';
import announcementRoutes from './announcement.routes.js';
import activityLogRoutes from './activityLog.routes.js';
import instructorRoutes from './instructor.routes.js';
import learningPathRoutes from './learningPath.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);

// Phase 4
router.use('/courses', courseRoutes);
router.use('/modules', moduleRoutes);
router.use('/lessons', lessonRoutes);
router.use('/trainings', trainingRoutes);
router.use('/me', learningRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/instructor', instructorRoutes);
router.use('/learning-paths', learningPathRoutes);
router.use('/uploads', uploadRoutes);

// Phase 5
router.use('/quizzes', quizRoutes);
router.use('/questions', quizQuestionRoutes);
router.use('/quiz-attempts', quizAttemptRoutes);

// Phase 6 — Certification & Competency Management
router.use('/certifications', certificationRoutes);
router.use('/certificates', certificateRoutes);
router.use('/competencies', competencyRoutes);
router.use('/reports', reportingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/announcements', announcementRoutes);
router.use('/audit-logs', activityLogRoutes);

export default router;
