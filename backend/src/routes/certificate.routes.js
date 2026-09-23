import { Router } from 'express';
import * as certificateController from '../controllers/certificate.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listCertificatesSchema,
  revokeCertificateSchema,
} from '../validators/certification.validation.js';

const router = Router();

// Public endpoint - accessible without authentication
router.get('/verify/:verificationCode', certificateController.verifyCertificate);

// Protected endpoints
router.use(authenticate);

router.get(
  '/',
  authorize('COMPANY_ADMIN'),
  validate(listCertificatesSchema),
  certificateController.listCertificates
);

router.get(
  '/:id',
  certificateController.getCertificate
);

router.post(
  '/:id/revoke',
  authorize('COMPANY_ADMIN'),
  validate(revokeCertificateSchema),
  certificateController.revokeCertificate
);

export default router;

