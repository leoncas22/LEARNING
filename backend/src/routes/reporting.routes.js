import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as reportingController from '../controllers/reporting.controller.js';

const router = Router();
router.use(authenticate, authorize('COMPANY_ADMIN'));
router.get('/dashboard', reportingController.getDashboard);
router.get('/learning', reportingController.getSection);
router.get('/quiz', reportingController.getSection);
router.get('/certifications', reportingController.getSection);
router.get('/competencies', reportingController.getSection);
router.get('/departments', reportingController.getSection);
router.get('/employees/:employeeId', reportingController.getEmployee);
router.get('/trainings', reportingController.getTrainings);
router.get('/export/:type', reportingController.exportReport);
router.get('/export/training', reportingController.exportTraining);
export default router;
