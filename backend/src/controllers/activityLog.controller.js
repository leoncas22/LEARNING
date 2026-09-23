import { asyncHandler } from '../middleware/errorHandler.js';
import * as service from '../services/activityLog.service.js';
export const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user, req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
});
