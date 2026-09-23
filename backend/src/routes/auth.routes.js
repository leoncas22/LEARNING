import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  registerCompanySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.validation.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
  verificationLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', refreshLimiter, authController.refresh);
router.get('/me', authenticate, authController.me);

router.post(
  '/register-company',
  registerLimiter,
  validate(registerCompanySchema),
  authController.registerCompany
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.post('/verify-email', verificationLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  verificationLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

export default router;
