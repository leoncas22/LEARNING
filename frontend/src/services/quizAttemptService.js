import apiClient from './apiClient';

export async function listMyQuizzes() {
  const res = await apiClient.get('/me/quizzes');
  return res.data.data;
}

export async function getMyQuizHistory() {
  const res = await apiClient.get('/me/quiz-history');
  return res.data.data;
}

export async function startAttempt(quizId) {
  const res = await apiClient.post(`/quizzes/${quizId}/attempts`);
  return res.data.data;
}

export async function getAttempt(attemptId) {
  const res = await apiClient.get(`/quiz-attempts/${attemptId}`);
  return res.data.data;
}

export async function saveAnswer(attemptId, questionId, submission) {
  const res = await apiClient.put(`/quiz-attempts/${attemptId}/answers/${questionId}`, submission);
  return res.data.data;
}

export async function submitAttempt(attemptId) {
  const res = await apiClient.post(`/quiz-attempts/${attemptId}/submit`);
  return res.data.data;
}

export async function getAttemptResult(attemptId) {
  const res = await apiClient.get(`/quiz-attempts/${attemptId}/result`);
  return res.data.data;
}

export default { listMyQuizzes, getMyQuizHistory, startAttempt, getAttempt, saveAnswer, submitAttempt, getAttemptResult };
