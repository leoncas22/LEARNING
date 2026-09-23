import apiClient from './apiClient';

export async function listMyCourses(params = {}) {
  const res = await apiClient.get('/me/courses', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getMyCourse(id) {
  const res = await apiClient.get(`/me/courses/${id}`);
  return res.data.data;
}

export async function getMyLearningSummary() {
  const res = await apiClient.get('/me/learning-summary');
  return res.data.data;
}

export default { listMyCourses, getMyCourse, getMyLearningSummary };
