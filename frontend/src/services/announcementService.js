import apiClient from './apiClient';

export async function listAnnouncements(params = {}) {
  const res = await apiClient.get('/announcements', { params });
  const payload = res.data || {};
  return { data: payload.data || [], pagination: payload.pagination };
}

export async function createAnnouncement(input) {
  const res = await apiClient.post('/announcements', input);
  return res.data?.data;
}

export async function getAnnouncement(id) {
  const res = await apiClient.get(`/announcements/${id}`);
  return res.data?.data;
}

export async function updateAnnouncement(id, input) {
  const res = await apiClient.patch(`/announcements/${id}`, input);
  return res.data?.data;
}

export async function publishAnnouncement(id) {
  const res = await apiClient.post(`/announcements/${id}/publish`);
  return res.data?.data;
}

export async function archiveAnnouncement(id) {
  const res = await apiClient.post(`/announcements/${id}/archive`);
  return res.data?.data;
}

export default { listAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement, publishAnnouncement, archiveAnnouncement };
