import apiClient from './apiClient';

export async function listCompetencies(params = {}) {
  const res = await apiClient.get('/competencies', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getCompetency(id) {
  const res = await apiClient.get(`/competencies/${id}`);
  return res.data.data;
}

export async function createCompetency(payload) {
  const res = await apiClient.post('/competencies', payload);
  return res.data.data;
}

export async function updateCompetency(id, payload) {
  const res = await apiClient.patch(`/competencies/${id}`, payload);
  return res.data.data;
}

export async function archiveCompetency(id) {
  const res = await apiClient.post(`/competencies/${id}/archive`);
  return res.data.data;
}

// Course Competencies
export async function listCourseCompetencies(courseId) {
  const res = await apiClient.get(`/courses/${courseId}/competencies`);
  return res.data.data;
}

export async function assignCourseCompetency(courseId, payload) {
  const res = await apiClient.post(`/courses/${courseId}/competencies`, payload);
  return res.data.data;
}

export async function removeCourseCompetency(courseId, competencyId) {
  const res = await apiClient.delete(`/courses/${courseId}/competencies/${competencyId}`);
  return res.data.data;
}

// Employee self-service
export async function getMyCompetencies() {
  const res = await apiClient.get('/me/competencies');
  return res.data.data;
}

export async function getMyCompetencyDetail(id) {
  const res = await apiClient.get(`/me/competencies/${id}`);
  return res.data.data;
}

export default {
  listCompetencies,
  getCompetency,
  createCompetency,
  updateCompetency,
  archiveCompetency,
  listCourseCompetencies,
  assignCourseCompetency,
  removeCourseCompetency,
  getMyCompetencies,
  getMyCompetencyDetail,
};

