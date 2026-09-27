import apiClient from './apiClient';

export async function getDashboard() {
  const res = await apiClient.get('/instructor/dashboard');
  return res.data;
}

export async function listLearners(courseId, params = {}) {
  const res = await apiClient.get(`/instructor/courses/${courseId}/learners`, { params });
  return { data: res.data?.data || [], pagination: res.data?.pagination };
}

export default { getDashboard, listLearners };
