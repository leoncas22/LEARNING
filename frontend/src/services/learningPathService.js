import apiClient from './apiClient';

export async function listPaths(params = {}) { const res = await apiClient.get('/learning-paths', { params }); return res.data?.data || []; }
export async function getPath(id) { const res = await apiClient.get(`/learning-paths/${id}`); return res.data?.data || null; }
export async function createPath(payload) { const res = await apiClient.post('/learning-paths', payload); return res.data?.data; }
export async function publishPath(id) { const res = await apiClient.post(`/learning-paths/${id}/publish`); return res.data?.data; }
export async function archivePath(id) { const res = await apiClient.post(`/learning-paths/${id}/archive`); return res.data?.data; }
export async function updatePath(id, payload) { const res = await apiClient.patch(`/learning-paths/${id}`, payload); return res.data?.data; }
export async function addCourse(id, payload) { const res = await apiClient.post(`/learning-paths/${id}/courses`, payload); return res.data?.data; }
export async function removeCourse(id, courseId) { await apiClient.delete(`/learning-paths/${id}/courses/${courseId}`); }
export async function reorderCourses(id, courseIds) { const res = await apiClient.patch(`/learning-paths/${id}/courses/reorder`, { courseIds }); return res.data?.data; }
export async function assignPath(id, payload) { const res = await apiClient.post(`/learning-paths/${id}/assign`, payload); return res.data?.data; }
export async function listProgress(id, params = {}) { const res = await apiClient.get(`/learning-paths/${id}/progress`, { params }); return { data: res.data?.data || [], pagination: res.data?.pagination }; }
export async function listMyPaths() { const res = await apiClient.get('/me/learning-paths'); return res.data?.data || []; }
export async function getMyPath(id) { const res = await apiClient.get(`/me/learning-paths/${id}`); return res.data?.data || null; }
export default { listPaths, getPath, createPath, publishPath, archivePath, updatePath, addCourse, removeCourse, reorderCourses, assignPath, listProgress, listMyPaths, getMyPath };
