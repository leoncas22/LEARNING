import { Router } from 'express';
import * as trainingController from '../controllers/training.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { assignTrainingSchema, listTrainingsSchema } from '../validators/training.validation.js';

const router = Router();

router.use(authenticate, authorize('COMPANY_ADMIN'));

router.get('/', validate(listTrainingsSchema), trainingController.listTrainings);
router.post('/assign', validate(assignTrainingSchema), trainingController.assignTraining);
router.get('/:id', trainingController.getTraining);

export default router;
