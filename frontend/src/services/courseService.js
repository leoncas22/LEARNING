import apiClient from './apiClient';

export async function listCourses(params = {}) {
  const res = await apiClient.get('/courses', { params });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getCourse(id) {
  const res = await apiClient.get(`/courses/${id}`);
  return res.data.data;
}

export async function createCourse(payload) {
  const res = await apiClient.post('/courses', payload);
  return res.data.data;
}

export async function updateCourse(id, payload) {
  const res = await apiClient.patch(`/courses/${id}`, payload);
  return res.data.data;
}

export async function getPublishReadiness(id) {
  const res = await apiClient.get(`/courses/${id}/publish-readiness`);
  return res.data.data;
}

export async function publishCourse(id) {
  const res = await apiClient.post(`/courses/${id}/publish`);
  return res.data.data;
}

export async function archiveCourse(id) {
  const res = await apiClient.post(`/courses/${id}/archive`);
  return res.data.data;
}

// Modules
export async function createModule(courseId, payload) {
  const res = await apiClient.post(`/courses/${courseId}/modules`, payload);
  return res.data.data;
}

export async function updateModule(moduleId, payload) {
  const res = await apiClient.patch(`/modules/${moduleId}`, payload);
  return res.data.data;
}

export async function deleteModule(moduleId) {
  await apiClient.delete(`/modules/${moduleId}`);
}

export async function reorderModules(courseId, order) {
  const res = await apiClient.post(`/courses/${courseId}/modules/reorder`, { order });
  return res.data.data;
}

// Lessons
export async function createLesson(moduleId, payload) {
  const res = await apiClient.post(`/modules/${moduleId}/lessons`, payload);
  return res.data.data;
}

export async function getLesson(lessonId) {
  const res = await apiClient.get(`/lessons/${lessonId}`);
  return res.data.data;
}

export async function updateLesson(lessonId, payload) {
  const res = await apiClient.patch(`/lessons/${lessonId}`, payload);
  return res.data.data;
}

export async function deleteLesson(lessonId) {
  await apiClient.delete(`/lessons/${lessonId}`);
}

export async function reorderLessons(moduleId, order) {
  const res = await apiClient.post(`/modules/${moduleId}/lessons/reorder`, { order });
  return res.data.data;
}

export async function completeLesson(lessonId) {
  const res = await apiClient.post(`/lessons/${lessonId}/complete`);
  return res.data.data;
}

export default {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  getPublishReadiness,
  publishCourse,
  archiveCourse,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  getLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  completeLesson,
};
