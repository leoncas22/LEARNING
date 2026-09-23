import { Router } from 'express';
import * as controller from '../controllers/instructor.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate, authorize('INSTRUCTOR'));
router.get('/dashboard', controller.getDashboard);
router.get('/courses/:courseId/learners', controller.listLearners);

export default router;
