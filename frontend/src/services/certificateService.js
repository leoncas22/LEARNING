import apiClient from './apiClient';

export async function listCertificates(params = {}) {
  const res = await apiClient.get('/certificates', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getCertificate(id) {
  const res = await apiClient.get(`/certificates/${id}`);
  return res.data.data;
}

export async function revokeCertificate(id, reason = '') {
  const res = await apiClient.post(`/certificates/${id}/revoke`, { reason });
  return res.data.data;
}

export async function listMyCertificates() {
  const res = await apiClient.get('/me/certificates');
  return res.data.data;
}

export async function verifyCertificate(verificationCode) {
  const res = await apiClient.get(`/certificates/verify/${verificationCode}`);
  return res.data.data;
}

export default {
  listCertificates,
  getCertificate,
  revokeCertificate,
  listMyCertificates,
  verifyCertificate,
};

