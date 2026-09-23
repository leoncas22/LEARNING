import { asyncHandler } from '../middleware/errorHandler.js';
import * as resultsService from '../services/quizResults.service.js';

export const getQuizResults = asyncHandler(async (req, res) => {
  const result = await resultsService.getQuizResults(req.user, req.params.quizId, req.query);
  res.status(200).json({ success: true, message: 'Results retrieved', data: result.data, pagination: result.pagination });
});

export const getAttemptDetail = asyncHandler(async (req, res) => {
  const detail = await resultsService.getAttemptDetailForStaff(req.user, req.params.attemptId);
  res.status(200).json({ success: true, message: 'Attempt detail retrieved', data: detail });
});
