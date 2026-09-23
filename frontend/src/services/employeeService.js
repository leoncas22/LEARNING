import apiClient from './apiClient';

export async function listEmployees(params = {}) {
  const res = await apiClient.get('/employees', { params });
  return res.data.data;
}

export default { listEmployees };
