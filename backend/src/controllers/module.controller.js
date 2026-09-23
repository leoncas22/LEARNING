import { asyncHandler } from '../middleware/errorHandler.js';
import * as moduleService from '../services/module.service.js';

export const createModule = asyncHandler(async (req, res) => {
  const module_ = await moduleService.createModule(req.user, req.params.courseId, req.body);
  res.status(201).json({ success: true, message: 'Module created successfully', data: module_ });
});

export const updateModule = asyncHandler(async (req, res) => {
  const module_ = await moduleService.updateModule(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Module updated successfully', data: module_ });
});

export const deleteModule = asyncHandler(async (req, res) => {
  await moduleService.deleteModule(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Module deleted successfully', data: {} });
});

export const reorderModules = asyncHandler(async (req, res) => {
  const modules = await moduleService.reorderModules(req.user, req.params.courseId, req.body.order);
  res.status(200).json({ success: true, message: 'Modules reordered successfully', data: modules });
});
