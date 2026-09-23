import apiClient from './apiClient';

export async function listCertifications(params = {}) {
  const res = await apiClient.get('/certifications', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getCertification(id) {
  const res = await apiClient.get(`/certifications/${id}`);
  return res.data.data;
}

export async function createCertification(payload) {
  const res = await apiClient.post('/certifications', payload);
  return res.data.data;
}

export async function updateCertification(id, payload) {
  const res = await apiClient.patch(`/certifications/${id}`, payload);
  return res.data.data;
}

export async function archiveCertification(id) {
  const res = await apiClient.post(`/certifications/${id}/archive`);
  return res.data.data;
}

export async function checkEligibility(id, userId = null) {
  const params = userId ? { userId } : {};
  const res = await apiClient.get(`/certifications/${id}/eligibility`, { params });
  return res.data.data;
}

export default {
  listCertifications,
  getCertification,
  createCertification,
  updateCertification,
  archiveCertification,
  checkEligibility,
};

