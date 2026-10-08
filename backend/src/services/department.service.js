import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../utils/activityLog.js';

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

export async function listDepartments(actingUser) {
  return prisma.department.findMany({
    where: { companyId: actingUser.companyId },
    select: DEPARTMENT_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function createDepartment(actingUser, { name, description }) {
  const normalizedName = name.trim();
  const existing = await prisma.department.findFirst({
    where: { companyId: actingUser.companyId, name: normalizedName },
    select: { id: true },
  });
  if (existing) throw new AppError('A department with this name already exists', 409, 'DUPLICATE_DEPARTMENT');

  let department;
  try {
    department = await prisma.department.create({
      data: {
        companyId: actingUser.companyId,
        name: normalizedName,
        description: description?.trim() || null,
      },
      select: DEPARTMENT_SELECT,
    });
  } catch (error) {
    if (error.code === 'P2002') throw new AppError('A department with this name already exists', 409, 'DUPLICATE_DEPARTMENT');
    throw error;
  }
  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'DEPARTMENT_CREATED',
    entity: 'DEPARTMENT',
    entityId: department.id,
    metadata: { name: department.name },
  });
  return department;
}

export async function deleteDepartment(actingUser, departmentId) {
  const department = await prisma.department.findFirst({
    where: { id: departmentId, companyId: actingUser.companyId },
    select: { id: true, name: true },
  });
  if (!department) throw new AppError('Department not found', 404, 'NOT_FOUND');

  await prisma.department.delete({ where: { id: department.id } });
  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'DEPARTMENT_DELETED',
    entity: 'DEPARTMENT',
    entityId: department.id,
    metadata: { name: department.name },
  });
}

export default { listDepartments, createDepartment, deleteDepartment };
