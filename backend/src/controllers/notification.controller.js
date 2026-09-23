import { asyncHandler } from '../middleware/errorHandler.js';
import * as notificationService from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user, req.query);
  res.json({ success: true, message: 'Notifications retrieved', data: data.data, unreadCount: data.unreadCount, pagination: data.pagination });
});
export const unreadCount = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user, { page: 1, limit: 1, unread: 'true' });
  res.json({ success: true, data: { unreadCount: data.unreadCount } });
});
export const read = asyncHandler(async (req, res) => {
  const result = await notificationService.markRead(req.user, req.params.id);
  if (!result) {
    res.status(404).json({ success: false, message: 'Notification not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, message: 'Notification marked as read' });
});

export const readAll = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user);
  res.json({ success: true, message: 'Notifications marked as read' });
});
