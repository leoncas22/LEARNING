import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { logActivity } from '../utils/activityLog.js';

const ASSIGNABLE_ROLES = ['EMPLOYEE', 'INSTRUCTOR'];

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
 * companyId is always taken from the authenticated admin, never the payload.
 * Only EMPLOYEE and INSTRUCTOR roles are assignable through this workflow.
 * Supplied passwords are hashed with Argon2id before storage.
 *
 * Production-recommended flow (invitation email ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ user sets their own
 * password ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ account activates) is architecturally ready: swap the
 */
export async function createEmployee(actingUser, { name, email, password, departmentId, positionId, employeeNumber, role }) {
  assertCompanyAdmin(actingUser);
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError('Only employee and instructor accounts can be provisioned here', 403, 'FORBIDDEN');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId: actingUser.companyId } });
    if (!department) {
      throw new AppError('Department not found', 404, 'NOT_FOUND');
    }
  }
  if (positionId) {
    const position = await prisma.position.findFirst({ where: { id: positionId, companyId: actingUser.companyId } });
    if (!position) {
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
      name: name.trim(),
      email: normalizedEmail,
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

function assertCompanyAdmin(actingUser) {
  if (actingUser.role !== 'COMPANY_ADMIN' || !actingUser.companyId) {
    throw new AppError('Company admin access required', 403, 'FORBIDDEN');
  }
}

function scopedUserWhere(actingUser, id) {
  assertCompanyAdmin(actingUser);
  return { id, companyId: actingUser.companyId, deletedAt: null };
}

export async function listEmployees(actingUser, query = {}) {
  assertCompanyAdmin(actingUser);
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Number(query.limit) || 20);
  const where = { companyId: actingUser.companyId, deletedAt: null };
  where.role = query.role
    ? { name: query.role }
    : { name: { in: ['COMPANY_ADMIN', ...ASSIGNABLE_ROLES] } };
  if (query.status) where.status = query.status;
  if (query.departmentId) where.department = { id: query.departmentId, companyId: actingUser.companyId };
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
  assertCompanyAdmin(actingUser);
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
  assertCompanyAdmin(actingUser);
  const existing = await prisma.user.findFirst({
    where: scopedUserWhere(actingUser, employeeId),
    select: {
      id: true,
      email: true,
      role: { select: { name: true } },
    },
  });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (existing.id === actingUser.id || ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(existing.role.name)) {
    throw new AppError('Privileged or current administrator accounts cannot be managed here', 403, 'FORBIDDEN');
  }
  await validateRelations(
    actingUser,
    Object.hasOwn(input, 'departmentId') ? input.departmentId : undefined,
    Object.hasOwn(input, 'positionId') ? input.positionId : undefined,
  );
  if (input.email && input.email !== existing.email) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (duplicate) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
    input = { ...input, email: normalizedEmail };
  }
  const data = { ...input };
  delete data.password;
  delete data.role;
  if (input.password) data.password = await hashPassword(input.password);
  if (input.role && !ASSIGNABLE_ROLES.includes(input.role)) {
    throw new AppError('Only employee and instructor roles can be assigned here', 403, 'FORBIDDEN');
  }
  if (input.role && input.role !== existing.role.name) {
    const role = await prisma.role.findUnique({ where: { name: input.role } });
    if (!role) throw new AppError('Invalid role', 422, 'VALIDATION_ERROR');
    data.roleId = role.id;
  }
  const roleChanged = Boolean(input.role && input.role !== existing.role.name);
  const revokeSessions = Boolean(input.password || roleChanged);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: employeeId, companyId: actingUser.companyId, deletedAt: null },
      data,
      select: SAFE_SELECT,
    });
    if (revokeSessions) {
      await tx.refreshToken.updateMany({ where: { userId: employeeId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'USER_UPDATED',
      entity: 'USER',
      entityId: employeeId,
      metadata: { fields: Object.keys(input).filter((field) => field !== 'password') },
    });
    if (input.password) {
      await logActivity(tx, { userId: actingUser.id, companyId: actingUser.companyId, action: 'PASSWORD_CHANGED', entity: 'USER', entityId: employeeId });
    }
    if (roleChanged) {
      await logActivity(tx, { userId: actingUser.id, companyId: actingUser.companyId, action: 'ROLE_CHANGED', entity: 'USER', entityId: employeeId, metadata: { from: existing.role.name, to: input.role } });
    }
    return result;
  });
  return updated;
}

export async function updateStatus(actingUser, employeeId, status) {
  assertCompanyAdmin(actingUser);
  const existing = await prisma.user.findFirst({ where: scopedUserWhere(actingUser, employeeId), select: { id: true, status: true, role: { select: { name: true } } } });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (existing.id === actingUser.id || ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(existing.role.name)) {
    throw new AppError('Privileged or current administrator accounts cannot be changed here', 403, 'FORBIDDEN');
  }
  if (existing.status === status) {
    return prisma.user.findFirst({
      where: scopedUserWhere(actingUser, employeeId),
      select: SAFE_SELECT,
    });
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: employeeId, companyId: actingUser.companyId, deletedAt: null },
      data: { status },
      select: SAFE_SELECT,
    });
    if (status !== 'ACTIVE') {
      await tx.refreshToken.updateMany({ where: { userId: employeeId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'USER',
      entityId: employeeId,
    });
    return updated;
  });
}

/**
 * IDOR-safe single-employee lookup: a Company Admin can only ever receive
 * a row belonging to their own tenant. Cross-tenant requests get the same
 * 404 as a nonexistent id ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â see companyAccess.js for the rationale.
 */
export async function getEmployeeById(actingUser, employeeId) {
  assertCompanyAdmin(actingUser);
  const employee = await prisma.user.findFirst({
    where: scopedUserWhere(actingUser, employeeId),
    select: SAFE_SELECT,
  });
  if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND');
  return employee;
}

export default { createEmployee, listEmployees, getOptions, getEmployeeById, updateEmployee, updateStatus };
