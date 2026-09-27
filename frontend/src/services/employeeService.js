import apiClient from './apiClient';

export async function listEmployees(params = {}) {
  const res = await apiClient.get('/employees', { params });
  return { data: res.data?.data || [], pagination: res.data?.pagination };
}

export async function getEmployee(id) {
  const res = await apiClient.get(`/employees/${id}`);
  return res.data;
}

export async function getEmployeeOptions() {
  const res = await apiClient.get('/employees/options');
  return res.data;
}

export async function createEmployee(payload) {
  const res = await apiClient.post('/employees', payload);
  return res.data;
}

export async function updateEmployee(id, payload) {
  const res = await apiClient.patch(`/employees/${id}`, payload);
  return res.data;
}

export async function updateEmployeeStatus(id, status) {
  const res = await apiClient.patch(`/employees/${id}/status`, { status });
  return res.data;
}

export default { listEmployees, getEmployee, getEmployeeOptions, createEmployee, updateEmployee, updateEmployeeStatus };
