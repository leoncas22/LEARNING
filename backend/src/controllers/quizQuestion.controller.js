import { asyncHandler } from '../middleware/errorHandler.js';
import * as questionService from '../services/quizQuestion.service.js';

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(req.user, req.params.quizId, req.body);
  res.status(201).json({ success: true, message: 'Question created successfully', data: question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Question updated successfully', data: question });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Question deleted successfully', data: {} });
});

export const reorderQuestions = asyncHandler(async (req, res) => {
  const questions = await questionService.reorderQuestions(req.user, req.params.quizId, req.body.items);
  res.status(200).json({ success: true, message: 'Questions reordered successfully', data: questions });
});
