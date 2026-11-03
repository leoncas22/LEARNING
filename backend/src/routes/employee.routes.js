import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema, employeeStatusSchema, employeeListSchema, employeeIdSchema, employeeOptionsSchema } from '../validators/auth.validation.js';

const router = Router();

// Every route here requires an authenticated Company Admin — Instructor
// and Employee roles never reach these handlers.
router.use(authenticate, authorize('COMPANY_ADMIN'));

router.get('/', validate(employeeListSchema), employeeController.listEmployees);
router.get('/options', validate(employeeOptionsSchema), employeeController.getOptions);
router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);

router.patch('/:id/status', validate(employeeIdSchema), validate(employeeStatusSchema), employeeController.updateStatus);
router.patch('/:id', validate(employeeIdSchema), validate(updateEmployeeSchema), employeeController.updateEmployee);

router.get('/:id', validate(employeeIdSchema), employeeController.getEmployee);

export default router;
