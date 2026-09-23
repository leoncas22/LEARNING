import { Router } from 'express';
import * as competencyController from '../controllers/competency.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listCompetenciesSchema,
  createCompetencySchema,
  updateCompetencySchema,
} from '../validators/competency.validation.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  validate(listCompetenciesSchema),
  competencyController.listCompetencies
);

router.post(
  '/',
  authorize('COMPANY_ADMIN'),
  validate(createCompetencySchema),
  competencyController.createCompetency
);

router.get(
  '/:id',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  competencyController.getCompetency
);

router.patch(
  '/:id',
  authorize('COMPANY_ADMIN'),
  validate(updateCompetencySchema),
  competencyController.updateCompetency
);

router.post(
  '/:id/archive',
  authorize('COMPANY_ADMIN'),
  competencyController.archiveCompetency
);

export default router;

