import { asyncHandler } from '../middleware/errorHandler.js';
import * as instructorService from '../services/instructor.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await instructorService.getDashboard(req.user);
  res.status(200).json({ success: true, message: 'Instructor dashboard retrieved', data });
});

export const listLearners = asyncHandler(async (req, res) => {
  const result = await instructorService.listLearners(req.user, req.params.courseId, req.query);
  res.status(200).json({ success: true, message: 'Learners retrieved', data: result.data, pagination: result.pagination });
});
