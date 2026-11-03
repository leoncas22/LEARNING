import { Router } from 'express';
import * as platformAdminController from '../controllers/platformAdmin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createPlatformUserSchema,
  platformCompanyListSchema,
  platformUserIdSchema,
  platformUserListSchema,
  updateCompanyStatusSchema,
  updatePlatformUserSchema,
} from '../validators/platformAdmin.validation.js';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/dashboard', platformAdminController.getDashboard);
router.get('/users', validate(platformUserListSchema), platformAdminController.listUsers);
router.post('/users', validate(createPlatformUserSchema), platformAdminController.createUser);
router.patch('/users/:id', validate(updatePlatformUserSchema), platformAdminController.updateUser);
router.delete('/users/:id', validate(platformUserIdSchema), platformAdminController.deleteUser);
router.get('/companies', validate(platformCompanyListSchema), platformAdminController.listCompanies);
router.patch('/companies/:id/status', validate(updateCompanyStatusSchema), platformAdminController.updateCompanyStatus);

export default router;
