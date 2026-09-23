import { asyncHandler } from '../middleware/errorHandler.js';
import * as lessonService from '../services/lesson.service.js';

export const createLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.createLesson(req.user, req.params.moduleId, req.body);
  res.status(201).json({ success: true, message: 'Lesson created successfully', data: lesson });
});

export const getLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.getLessonForViewing(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Lesson retrieved', data: lesson });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.updateLesson(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Lesson updated successfully', data: lesson });
});

export const deleteLesson = asyncHandler(async (req, res) => {
  await lessonService.deleteLesson(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Lesson deleted successfully', data: {} });
});

export const reorderLessons = asyncHandler(async (req, res) => {
  const lessons = await lessonService.reorderLessons(req.user, req.params.moduleId, req.body.order);
  res.status(200).json({ success: true, message: 'Lessons reordered successfully', data: lessons });
});

export const completeLesson = asyncHandler(async (req, res) => {
  const result = await lessonService.completeLesson(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Lesson marked complete', data: result });
});
