import apiClient from './apiClient';

export async function listNotifications(params = {}) {
  const res = await apiClient.get('/notifications', { params });
  const payload = res.data || {};
  return { data: payload.data || [], unreadCount: payload.unreadCount || 0, pagination: payload.pagination };
}

export async function markNotificationRead(id) {
  return apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return apiClient.patch('/notifications/read-all');
}

export default { listNotifications, markNotificationRead, markAllNotificationsRead };
