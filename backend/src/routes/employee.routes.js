import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { companyAccess } from '../middleware/companyAccess.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema } from '../validators/auth.validation.js';
import prisma from '../config/db.js';

const router = Router();

// Every route here requires an authenticated Company Admin — Instructor
// and Employee roles never reach these handlers.
router.use(authenticate, authorize('COMPANY_ADMIN'));

router.get('/', employeeController.listEmployees);
router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);

router.get(
  '/:id',
  companyAccess(async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { companyId: true } });
    return user?.companyId ?? null;
  }),
  employeeController.getEmployee
);

export default router;
