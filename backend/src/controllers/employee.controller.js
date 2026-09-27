import { asyncHandler } from '../middleware/errorHandler.js';
import * as employeeService from '../services/employee.service.js';

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.user, req.body);
  res.status(201).json({ success: true, message: 'Employee created successfully', data: employee });
});

export const listEmployees = asyncHandler(async (req, res) => {
  const employees = await employeeService.listEmployees(req.user, req.query);
  res.status(200).json({ success: true, message: 'Users retrieved', data: employees.data, pagination: employees.pagination });
});

export const getOptions = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'User options retrieved', data: await employeeService.getOptions(req.user) });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'User updated successfully', data: employee });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateStatus(req.user, req.params.id, req.body.status);
  res.status(200).json({ success: true, message: 'User status updated successfully', data: employee });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Employee retrieved', data: employee });
});
