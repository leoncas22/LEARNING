import { Router } from 'express';
import * as departmentController from '../controllers/department.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, departmentIdSchema } from '../validators/department.validation.js';

const router = Router();

router.use(authenticate, authorize('COMPANY_ADMIN'));
router.get('/', departmentController.listDepartments);
router.post('/', validate(createDepartmentSchema), departmentController.createDepartment);
router.delete('/:id', validate(departmentIdSchema), departmentController.deleteDepartment);

export default router;
