import { asyncHandler } from '../middleware/errorHandler.js';
import * as departmentService from '../services/department.service.js';

export const listDepartments = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Departments retrieved', data: await departmentService.listDepartments(req.user) });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(req.user, req.body);
  res.status(201).json({ success: true, message: 'Department created successfully', data: department });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  await departmentService.deleteDepartment(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Department deleted successfully' });
});
