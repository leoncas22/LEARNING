import { Router } from 'express';
import * as certificationController from '../controllers/certification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listCertificationsSchema,
  createCertificationSchema,
  updateCertificationSchema,
} from '../validators/certification.validation.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  validate(listCertificationsSchema),
  certificationController.listCertifications
);

router.post(
  '/',
  authorize('COMPANY_ADMIN'),
  validate(createCertificationSchema),
  certificationController.createCertification
);

router.get(
  '/:id',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  certificationController.getCertification
);

router.patch(
  '/:id',
  authorize('COMPANY_ADMIN'),
  validate(updateCertificationSchema),
  certificationController.updateCertification
);

router.post(
  '/:id/archive',
  authorize('COMPANY_ADMIN'),
  certificationController.archiveCertification
);

router.get(
  '/:id/eligibility',
  authorize('COMPANY_ADMIN', 'INSTRUCTOR'),
  certificationController.checkEligibility
);

export default router;

