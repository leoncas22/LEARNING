import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { logActivity } from '../utils/activityLog.js';
import { assertSameCompany } from '../middleware/companyAccess.js';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  employeeNumber: true,
  status: true,
  companyId: true,
  createdAt: true,
  role: { select: { name: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
};

/**
 * Company Admin creates an employee/instructor account directly (MVP flow).
 * companyId is ALWAYS taken from the authenticated admin's session, never
 * from the request body — a Company Admin cannot create a user in another
 * tenant no matter what they put in the payload.
 *
 * Production-recommended flow (invitation email → user sets their own
 * password → account activates) is architecturally ready: swap the
 * temporary-password branch below for an EmailVerificationToken-style
 * invitation token without touching anything else in this file.
 */
export async function createEmployee(actingUser, { name, email, password, departmentId, positionId, employeeNumber, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (role === 'COMPANY_ADMIN' && actingUser.role !== 'COMPANY_ADMIN') {
    throw new AppError('Company admin access required', 403, 'FORBIDDEN');
  }
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department || department.companyId !== actingUser.companyId) {
      throw new AppError('Department not found', 404, 'NOT_FOUND');
    }
  }
  if (positionId) {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position || position.companyId !== actingUser.companyId) {
      throw new AppError('Position not found', 404, 'NOT_FOUND');
    }
  }

  const roleEntity = await prisma.role.findUnique({ where: { name: role } });
  if (!roleEntity) {
    throw new AppError('Invalid role', 422, 'VALIDATION_ERROR');
  }

  const passwordHash = await hashPassword(password);

  const employee = await prisma.user.create({
    data: {
      companyId: actingUser.companyId,
      roleId: roleEntity.id,
      departmentId: departmentId ?? null,
      positionId: positionId ?? null,
      name,
      email,
      password: passwordHash,
      employeeNumber: employeeNumber ?? null,
      status: 'ACTIVE',
    },
    select: SAFE_SELECT,
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'USER_CREATED',
    entity: 'USER',
    entityId: employee.id,
    metadata: { email },
  });

  return employee;
}

function scopedUserWhere(actingUser, id) {
  return { id, companyId: actingUser.companyId, deletedAt: null };
}

export async function listEmployees(actingUser, query = {}) {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Number(query.limit) || 20);
  const where = { companyId: actingUser.companyId, deletedAt: null };
  if (query.role) where.role = { name: query.role };
  if (query.status) where.status = query.status;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.search) where.OR = [
    { name: { contains: query.search, mode: 'insensitive' } },
    { email: { contains: query.search, mode: 'insensitive' } },
    { employeeNumber: { contains: query.search, mode: 'insensitive' } },
  ];
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: SAFE_SELECT, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }};
}

export async function getOptions(actingUser) {
  const [departments, positions] = await Promise.all([
    prisma.department.findMany({ where: { companyId: actingUser.companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.position.findMany({ where: { companyId: actingUser.companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { departments, positions };
}

async function validateRelations(actingUser, departmentId, positionId) {
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId: actingUser.companyId } });
    if (!department) throw new AppError('Department not found', 404, 'NOT_FOUND');
  }
  if (positionId) {
    const position = await prisma.position.findFirst({ where: { id: positionId, companyId: actingUser.companyId } });
    if (!position) throw new AppError('Position not found', 404, 'NOT_FOUND');
  }
}

export async function updateEmployee(actingUser, employeeId, input) {
  const existing = await prisma.user.findFirst({
    where: scopedUserWhere(actingUser, employeeId),
    select: {
      id: true,
      email: true,
      role: { select: { name: true } },
    },
  });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');
  await validateRelations(actingUser, input.departmentId, input.positionId);
  if (input.email && input.email !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
    if (duplicate) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }
  const data = { ...input };
  delete data.password;
  delete data.role;
  if (input.password) data.password = await hashPassword(input.password);
  if (input.role) {
    const role = await prisma.role.findUnique({ where: { name: input.role } });
    if (!role) throw new AppError('Invalid role', 422, 'VALIDATION_ERROR');
    data.roleId = role.id;
  }
  const updated = await prisma.user.update({ where: { id: employeeId }, data, select: SAFE_SELECT });
  if (input.password) {
    await prisma.refreshToken.updateMany({ where: { userId: employeeId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await logActivity(prisma, { userId: actingUser.id, companyId: actingUser.companyId, action: 'USER_UPDATED', entity: 'USER', entityId: employeeId, metadata: { fields: Object.keys(input).filter((field) => field !== 'password') } });
  if (input.password) await logActivity(prisma, { userId: actingUser.id, companyId: actingUser.companyId, action: 'PASSWORD_CHANGED', entity: 'USER', entityId: employeeId });
  if (input.role) await logActivity(prisma, { userId: actingUser.id, companyId: actingUser.companyId, action: 'ROLE_CHANGED', entity: 'USER', entityId: employeeId });
  return updated;
}

export async function updateStatus(actingUser, employeeId, status) {
  const existing = await prisma.user.findFirst({ where: scopedUserWhere(actingUser, employeeId), select: { id: true } });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');
  const updated = await prisma.user.update({ where: { id: employeeId }, data: { status }, select: SAFE_SELECT });
  await prisma.refreshToken.updateMany({ where: { userId: employeeId, revokedAt: null }, data: { revokedAt: new Date() } });
  await logActivity(prisma, { userId: actingUser.id, companyId: actingUser.companyId, action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entity: 'USER', entityId: employeeId });
  return updated;
}

/**
 * IDOR-safe single-employee lookup: a Company Admin can only ever receive
 * a row belonging to their own tenant. Cross-tenant requests get the same
 * 404 as a nonexistent id — see companyAccess.js for the rationale.
 */
export async function getEmployeeById(actingUser, employeeId) {
  const employee = await prisma.user.findUnique({ where: { id: employeeId }, select: SAFE_SELECT });
  if (!employee) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(employee.companyId, actingUser);
  return employee;
}

export default { createEmployee, listEmployees, getOptions, getEmployeeById, updateEmployee, updateStatus };
