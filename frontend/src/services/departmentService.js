import apiClient from './apiClient';

export async function listDepartments() {
  const res = await apiClient.get('/departments');
  return res.data?.data || [];
}

export async function createDepartment(payload) {
  const res = await apiClient.post('/departments', payload);
  return res.data?.data;
}

export async function deleteDepartment(id) {
  await apiClient.delete(`/departments/${id}`);
}

export default { listDepartments, createDepartment, deleteDepartment };
