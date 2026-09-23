import apiClient from './apiClient';

export async function getHrDashboard() {
  const res = await apiClient.get('/dashboard/hr');
  return res.data.data;
}

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (evt) => onProgress(Math.round((evt.loaded / evt.total) * 100))
      : undefined,
  });
  return res.data.data; // { url, provider, mimetype }
}

export default { getHrDashboard, uploadFile };
