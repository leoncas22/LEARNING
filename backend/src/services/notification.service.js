import prisma from '../config/db.js';

export async function listNotifications(user, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where = { userId: user.id };
  if (query.unread === 'true') where.isRead = false;
  const [total, data, unread] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);
  return { data, unreadCount: unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function markRead(user, id) {
  const result = await prisma.notification.updateMany({ where: { id, userId: user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  if (!result.count) return null;
  return result;
}

export async function markAllRead(user) {
    return prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  }

export async function createNotification(data, client = prisma) {
    return client.notification.create({ data });
  }

export default { listNotifications, markRead, markAllRead, createNotification };
