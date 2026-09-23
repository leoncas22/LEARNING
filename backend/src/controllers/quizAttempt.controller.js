import { asyncHandler } from '../middleware/errorHandler.js';
import * as attemptService from '../services/quizAttempt.service.js';

export const listMyQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await attemptService.listMyQuizzes(req.user);
  res.status(200).json({ success: true, message: 'Quizzes retrieved', data: quizzes });
});

export const getMyQuizHistory = asyncHandler(async (req, res) => {
  const history = await attemptService.getMyQuizHistory(req.user);
  res.status(200).json({ success: true, message: 'Quiz history retrieved', data: history });
});

export const startAttempt = asyncHandler(async (req, res) => {
  const attempt = await attemptService.startOrResumeAttempt(req.user, req.params.quizId);
  res.status(201).json({ success: true, message: 'Attempt started', data: attempt });
});

export const getAttempt = asyncHandler(async (req, res) => {
  const attempt = await attemptService.getAttemptForTaking(req.user, req.params.attemptId);
  res.status(200).json({ success: true, message: 'Attempt retrieved', data: attempt });
});

export const saveAnswer = asyncHandler(async (req, res) => {
  const result = await attemptService.saveAnswer(req.user, req.params.attemptId, req.params.questionId, req.body);
  res.status(200).json({ success: true, message: 'Answer saved', data: result });
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const result = await attemptService.submitAttempt(req.user, req.params.attemptId);
  res.status(200).json({ success: true, message: 'Quiz submitted', data: result });
});

export const getAttemptResult = asyncHandler(async (req, res) => {
  const result = await attemptService.getMyAttemptResult(req.user, req.params.attemptId);
  res.status(200).json({ success: true, message: 'Result retrieved', data: result });
});
