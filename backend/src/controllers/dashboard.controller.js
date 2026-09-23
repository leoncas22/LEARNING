import { asyncHandler } from '../middleware/errorHandler.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getHrDashboard = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getHrDashboardStats(req.user);
  res.status(200).json({ success: true, message: 'Dashboard stats retrieved', data: stats });
});
