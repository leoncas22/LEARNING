import apiClient from './apiClient';

export async function listQuizzes(params = {}) {
  const res = await apiClient.get('/quizzes', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getQuiz(id) {
  const res = await apiClient.get(`/quizzes/${id}`);
  return res.data.data;
}

export async function createQuiz(payload) {
  const res = await apiClient.post('/quizzes', payload);
  return res.data.data;
}

export async function updateQuiz(id, payload) {
  const res = await apiClient.patch(`/quizzes/${id}`, payload);
  return res.data.data;
}

export async function getPublishReadiness(id) {
  const res = await apiClient.get(`/quizzes/${id}/publish-readiness`);
  return res.data.data;
}

export async function publishQuiz(id) {
  const res = await apiClient.post(`/quizzes/${id}/publish`);
  return res.data.data;
}

export async function archiveQuiz(id) {
  const res = await apiClient.post(`/quizzes/${id}/archive`);
  return res.data.data;
}

export async function getQuizResults(quizId, params = {}) {
  const res = await apiClient.get(`/quizzes/${quizId}/results`, { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

// Questions
export async function createQuestion(quizId, payload) {
  const res = await apiClient.post(`/quizzes/${quizId}/questions`, payload);
  return res.data.data;
}

export async function updateQuestion(questionId, payload) {
  const res = await apiClient.patch(`/questions/${questionId}`, payload);
  return res.data.data;
}

export async function deleteQuestion(questionId) {
  await apiClient.delete(`/questions/${questionId}`);
}

export async function reorderQuestions(quizId, items) {
  const res = await apiClient.post(`/quizzes/${quizId}/questions/reorder`, { items });
  return res.data.data;
}

// Staff attempt detail
export async function getAttemptStaffDetail(attemptId) {
  const res = await apiClient.get(`/quiz-attempts/${attemptId}/staff-detail`);
  return res.data.data;
}

export default {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  getPublishReadiness,
  publishQuiz,
  archiveQuiz,
  getQuizResults,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getAttemptStaffDetail,
};
