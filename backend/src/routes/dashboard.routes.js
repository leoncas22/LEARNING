import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/hr', authenticate, authorize('COMPANY_ADMIN'), dashboardController.getHrDashboard);

export default router;
