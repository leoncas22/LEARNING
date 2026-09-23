import { asyncHandler } from '../middleware/errorHandler.js';
import * as courseService from '../services/course.service.js';

export const listCourses = asyncHandler(async (req, res) => {
  const result = await courseService.listCourses(req.user, req.query);
  res.status(200).json({ success: true, message: 'Courses retrieved', data: result.data, pagination: result.pagination });
});

export const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.user, req.body);
  res.status(201).json({ success: true, message: 'Course created successfully', data: course });
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseDetail(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Course retrieved', data: course });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Course updated successfully', data: course });
});

export const publishCourse = asyncHandler(async (req, res) => {
  const course = await courseService.publishCourse(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Course published successfully', data: course });
});

export const archiveCourse = asyncHandler(async (req, res) => {
  const course = await courseService.archiveCourse(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Course archived successfully', data: course });
});

export const getPublishReadiness = asyncHandler(async (req, res) => {
  const { ready, problems } = await courseService.getPublishReadiness(req.user, req.params.id);
  res.status(200).json({ success: true, message: ready ? 'Course is ready to publish' : 'Course cannot be published yet.', data: { ready, problems } });
});
