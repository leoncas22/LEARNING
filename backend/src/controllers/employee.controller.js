import { asyncHandler } from '../middleware/errorHandler.js';
import * as employeeService from '../services/employee.service.js';

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.user, req.body);
  res.status(201).json({ success: true, message: 'Employee created successfully', data: employee });
});

export const listEmployees = asyncHandler(async (req, res) => {
  const employees = await employeeService.listEmployees(req.user);
  res.status(200).json({ success: true, message: 'Employees retrieved', data: employees });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Employee retrieved', data: employee });
});
