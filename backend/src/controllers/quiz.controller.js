import { asyncHandler } from '../middleware/errorHandler.js';
import * as quizService from '../services/quiz.service.js';

export const listQuizzes = asyncHandler(async (req, res) => {
  const result = await quizService.listQuizzes(req.user, req.query);
  res.status(200).json({ success: true, message: 'Quizzes retrieved', data: result.data, pagination: result.pagination });
});

export const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.createQuiz(req.user, req.body);
  res.status(201).json({ success: true, message: 'Quiz created successfully', data: quiz });
});

export const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.getQuizDetail(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Quiz retrieved', data: quiz });
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.updateQuiz(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Quiz updated successfully', data: quiz });
});

export const getPublishReadiness = asyncHandler(async (req, res) => {
  const { ready, problems } = await quizService.getPublishReadiness(req.user, req.params.id);
  res.status(200).json({ success: true, message: ready ? 'Quiz is ready to publish' : 'Quiz cannot be published yet.', data: { ready, problems } });
});

export const publishQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.publishQuiz(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Quiz published successfully', data: quiz });
});

export const archiveQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.archiveQuiz(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Quiz archived successfully', data: quiz });
});
