import apiClient from './apiClient';

export async function getDashboard() {
  const res = await apiClient.get('/reports/dashboard');
  return res.data;
}

export async function exportTrainingReport() {
  const res = await apiClient.get('/reports/export/training', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lms-training-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default { getDashboard, exportTrainingReport };
