import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { uploadSingleFile, handleUpload } from '../controllers/upload.controller.js';

const router = Router();

router.post('/', authenticate, authorize('COMPANY_ADMIN', 'INSTRUCTOR'), uploadSingleFile, handleUpload);

export default router;
