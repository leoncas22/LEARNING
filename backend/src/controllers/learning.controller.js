import { asyncHandler } from '../middleware/errorHandler.js';
import * as learningService from '../services/learning.service.js';

export const listMyCourses = asyncHandler(async (req, res) => {
  const result = await learningService.listMyCourses(req.user, req.query);
  res.status(200).json({ success: true, message: 'My courses retrieved', data: result.data, pagination: result.pagination });
});

export const getMyCourse = asyncHandler(async (req, res) => {
  const detail = await learningService.getMyCourseDetail(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Course retrieved', data: detail });
});

export const getMyLearningSummary = asyncHandler(async (req, res) => {
  const summary = await learningService.getMyLearningSummary(req.user);
  res.status(200).json({ success: true, message: 'Learning summary retrieved', data: summary });
});
