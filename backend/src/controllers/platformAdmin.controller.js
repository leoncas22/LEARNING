import { asyncHandler } from '../middleware/errorHandler.js';
import * as platformAdminService from '../services/platformAdmin.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await platformAdminService.getPlatformDashboard(req.user);
  res.status(200).json({ success: true, message: 'Platform dashboard retrieved', data });
});

export const listUsers = asyncHandler(async (req, res) => {
  const result = await platformAdminService.listPlatformUsers(req.user, req.query);
  res.status(200).json({ success: true, message: 'Platform users retrieved', data: result.data, pagination: result.pagination });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = await platformAdminService.createPlatformUser(req.user, req.body);
  res.status(201).json({ success: true, message: 'Platform user created', data });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = await platformAdminService.updatePlatformUser(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Platform user updated', data });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const data = await platformAdminService.deletePlatformUser(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Platform user deleted', data });
});

export const listCompanies = asyncHandler(async (req, res) => {
  const result = await platformAdminService.listPlatformCompanies(req.user, req.query);
  res.status(200).json({ success: true, message: 'Platform companies retrieved', data: result.data, pagination: result.pagination });
});

export const updateCompanyStatus = asyncHandler(async (req, res) => {
  const data = await platformAdminService.updateCompanyStatus(req.user, req.params.id, req.body.status);
  res.status(200).json({ success: true, message: 'Company status updated', data });
});
