import apiClient from './apiClient';

export async function listAuditLogs(params = {}) {
  const res = await apiClient.get('/audit-logs', { params });
  const payload = res.data || {};
  return { data: payload.data || [], pagination: payload.pagination };
}

export default { listAuditLogs };
