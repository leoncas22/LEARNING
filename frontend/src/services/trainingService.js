import apiClient from './apiClient';

export async function listTrainings(params = {}) {
  const res = await apiClient.get('/trainings', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getTraining(id) {
  const res = await apiClient.get(`/trainings/${id}`);
  return res.data.data;
}

export async function assignTraining(payload) {
  const res = await apiClient.post('/trainings/assign', payload);
  return { ...res.data.data, message: res.data.message };
}

export default { listTrainings, getTraining, assignTraining };
