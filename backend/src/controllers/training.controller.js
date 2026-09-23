import { asyncHandler } from '../middleware/errorHandler.js';
import * as trainingService from '../services/training.service.js';

export const listTrainings = asyncHandler(async (req, res) => {
  const result = await trainingService.listTrainings(req.user, req.query);
  res.status(200).json({ success: true, message: 'Trainings retrieved', data: result.data, pagination: result.pagination });
});

export const getTraining = asyncHandler(async (req, res) => {
  const training = await trainingService.getTrainingById(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Training retrieved', data: training });
});

export const assignTraining = asyncHandler(async (req, res) => {
  const result = await trainingService.assignTraining(req.user, req.body);
  res.status(201).json({
    success: true,
    message: `Successfully assigned: ${result.assigned}. Already assigned: ${result.alreadyAssigned}.`,
    data: result,
  });
});
