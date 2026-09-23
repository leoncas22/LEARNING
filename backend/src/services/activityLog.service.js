import prisma from '../config/db.js';

export async function list(user, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const where = { companyId: user.companyId };
  if (query.action) where.action = query.action;
  if (query.entity) where.entity = query.entity;
  if (query.search) {
    where.OR = [
      { action: { contains: query.search, mode: 'insensitive' } },
      { entity: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.createdAfter || query.createdBefore) {
    where.createdAt = {};
    if (query.createdAfter) where.createdAt.gte = query.createdAfter;
    if (query.createdBefore) where.createdAt.lte = query.createdBefore;
  }
  const [total, data] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export default { list };
