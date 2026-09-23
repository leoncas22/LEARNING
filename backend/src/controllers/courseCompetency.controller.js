import { asyncHandler } from '../middleware/errorHandler.js';
import * as courseCompetencyService from '../services/courseCompetency.service.js';

export const listCourseCompetencies = asyncHandler(async (req, res) => {
  const competencies = await courseCompetencyService.listCourseCompetencies(req.user, req.params.courseId);
  res.status(200).json({
    success: true,
    message: 'Course competencies retrieved successfully',
    data: competencies,
  });
});

export const addCourseCompetency = asyncHandler(async (req, res) => {
  const record = await courseCompetencyService.addCourseCompetency(req.user, req.params.courseId, req.body);
  res.status(201).json({
    success: true,
    message: 'Competency assigned to course successfully',
    data: record,
  });
});

export const removeCourseCompetency = asyncHandler(async (req, res) => {
  await courseCompetencyService.removeCourseCompetency(req.user, req.params.courseId, req.params.competencyId);
  res.status(200).json({
    success: true,
    message: 'Competency removed from course successfully',
  });
});

