import apiClient from './apiClient';

export async function getDashboard() {
  const response = await apiClient.get('/admin/dashboard');
  return response.data.data;
}

export async function listUsers(params = {}) {
  const response = await apiClient.get('/admin/users', { params });
  return { data: response.data.data || [], pagination: response.data.pagination };
}

export async function createUser(payload) {
  const response = await apiClient.post('/admin/users', payload);
  return response.data.data;
}

export async function updateUser(id, payload) {
  const response = await apiClient.patch(`/admin/users/${id}`, payload);
  return response.data.data;
}

export async function deleteUser(id) {
  const response = await apiClient.delete(`/admin/users/${id}`);
  return response.data.data;
}

export async function listCompanies(params = {}) {
  const response = await apiClient.get('/admin/companies', { params });
  return { data: response.data.data || [], pagination: response.data.pagination };
}

export async function updateCompanyStatus(id, status) {
  const response = await apiClient.patch(`/admin/companies/${id}/status`, { status });
  return response.data.data;
}

export default { getDashboard, listUsers, createUser, updateUser, deleteUser, listCompanies, updateCompanyStatus };
