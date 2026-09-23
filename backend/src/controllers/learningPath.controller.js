import { asyncHandler } from '../middleware/errorHandler.js';
import * as service from '../services/learningPath.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await service.listPaths(req.user, req.query);
  res.json({ success: true, message: 'Learning paths retrieved', data: result.data, pagination: result.pagination });
});
export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Learning path retrieved', data: await service.getPath(req.user, req.params.id) });
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, message: 'Learning path created', data: await service.createPath(req.user, req.body) });
});
export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Learning path updated', data: await service.updatePath(req.user, req.params.id, req.body) });
});
export const publish = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Learning path published', data: await service.publishPath(req.user, req.params.id) });
});
export const archive = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Learning path archived', data: await service.archivePath(req.user, req.params.id) });
});
export const addCourse = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, message: 'Course added to learning path', data: await service.addCourse(req.user, req.params.id, req.body) });
});
export const removeCourse = asyncHandler(async (req, res) => {
  await service.removeCourse(req.user, req.params.id, req.params.courseId);
  res.json({ success: true, message: 'Course removed' });
});
export const reorder = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Courses reordered', data: await service.reorderCourses(req.user, req.params.id, req.body.courseIds) });
});
export const assign = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, message: 'Learning path assigned', data: await service.assignPath(req.user, req.params.id, req.body) });
});
export const progress = asyncHandler(async (req, res) => {
  const result = await service.listProgress(req.user, req.params.id, req.query);
  res.json({ success: true, message: 'Learning path progress retrieved', data: result.data, pagination: result.pagination });
});
export const myPaths = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'My learning paths retrieved', data: await service.listMyPaths(req.user) });
});
export const myPath = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Learning path retrieved', data: await service.getMyPath(req.user, req.params.id) });
});
