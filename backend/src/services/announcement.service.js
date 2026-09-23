import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../utils/activityLog.js';

const adminSelect = { id: true, name: true, email: true };

function scoped(user) {
  return { companyId: user.companyId };
}

function canSee(user) {
  if (user.role === 'COMPANY_ADMIN') return scoped(user);
  return {
    companyId: user.companyId,
    status: 'PUBLISHED',
    OR: [{ departmentId: null }, { departmentId: user.departmentId || '__none__' }],
  };
}

export async function list(user, query = {}) {
  const where = canSee(user);
  if (user.role === 'COMPANY_ADMIN' && query.status) where.status = query.status;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const [total, data] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      include: { createdBy: { select: adminSelect }, department: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getById(user, id) {
  const result = await prisma.announcement.findFirst({ where: { AND: [canSee(user), { id }] }, include: { createdBy: { select: adminSelect }, department: true } });
  if (!result) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  return result;
}

export async function create(user, input) {
  const departmentId = input.audience === 'COMPANY' ? null : (input.departmentId || null);
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId: user.companyId }, select: { id: true } });
    if (!department) throw new AppError('Department not found', 404, 'NOT_FOUND');
  }
  const announcement = await prisma.announcement.create({ data: { companyId: user.companyId, createdById: user.id, departmentId, title: input.title, content: input.content }, include: { department: true } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'ANNOUNCEMENT_CREATED', entity: 'ANNOUNCEMENT', entityId: announcement.id, metadata: { title: announcement.title } });
  return announcement;
}

export async function update(user, id, input) {
  const existing = await prisma.announcement.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const nextDepartmentId = input.audience === 'COMPANY'
    ? null
    : (input.departmentId !== undefined ? (input.departmentId || null) : existing.departmentId);
  if (nextDepartmentId) {
    const department = await prisma.department.findFirst({ where: { id: nextDepartmentId, companyId: user.companyId }, select: { id: true } });
    if (!department) throw new AppError('Department not found', 404, 'NOT_FOUND');
  }
  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.audience !== undefined || input.departmentId !== undefined ? { departmentId: nextDepartmentId } : {}),
    },
    include: { department: true },
  });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'ANNOUNCEMENT_UPDATED', entity: 'ANNOUNCEMENT', entityId: id, metadata: { title: announcement.title } });
  return announcement;
}

export async function changeStatus(user, id, status) {
  const existing = await prisma.announcement.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const announcement = await prisma.announcement.update({ where: { id }, data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : existing.publishedAt } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: `ANNOUNCEMENT_${status}`, entity: 'ANNOUNCEMENT', entityId: id, metadata: { title: announcement.title } });
  if (status === 'PUBLISHED') {
    const recipients = await prisma.user.findMany({ where: { companyId: user.companyId, status: 'ACTIVE', role: { name: 'EMPLOYEE' }, ...(announcement.departmentId ? { departmentId: announcement.departmentId } : {}) }, select: { id: true } });
    if (recipients.length) await prisma.notification.createMany({ data: recipients.map((recipient) => ({ userId: recipient.id, title: announcement.title, message: announcement.content, type: 'ANNOUNCEMENT' })) });
  }
  return announcement;
}

export default { list, getById, create, update, changeStatus };
