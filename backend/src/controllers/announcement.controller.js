import { asyncHandler } from '../middleware/errorHandler.js';
import * as service from '../services/announcement.service.js';
export const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user, req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
});
export const get = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getById(req.user, req.params.id) }));
export const create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.create(req.user, req.body) }));
export const update = asyncHandler(async (req, res) => res.json({ success: true, data: await service.update(req.user, req.params.id, req.body) }));
export const publish = asyncHandler(async (req, res) => res.json({ success: true, data: await service.changeStatus(req.user, req.params.id, 'PUBLISHED') }));
export const archive = asyncHandler(async (req, res) => res.json({ success: true, data: await service.changeStatus(req.user, req.params.id, 'ARCHIVED') }));
