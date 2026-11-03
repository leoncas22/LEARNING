import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { logActivity } from '../utils/activityLog.js';

const USER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE'];
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const COMPANY_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const PLATFORM_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  status: true,
  employeeNumber: true,
  lastLoginAt: true,
  createdAt: true,
  companyId: true,
  departmentId: true,
  positionId: true,
  role: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, slug: true, status: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
};

function assertSuperAdmin(actingUser) {
  if (actingUser?.role !== 'SUPER_ADMIN') {
    throw new AppError('Platform administrator access required', 403, 'FORBIDDEN');
  }
}

function parsePage(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function validateStatus(status, allowed, label) {
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid ${label}`, 422, 'VALIDATION_ERROR');
  }
}

async function getRoleOrThrow(roleName) {
  if (!USER_ROLES.includes(roleName)) {
    throw new AppError('Invalid user role', 422, 'VALIDATION_ERROR');
  }
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new AppError('System roles are not initialized', 500, 'ROLES_NOT_SEEDED');
  return role;
}

async function validateCompanyAndRelations(companyId, departmentId, positionId, roleName) {
  if (roleName === 'SUPER_ADMIN') {
    if (companyId) throw new AppError('Super admin accounts must not belong to a company', 422, 'VALIDATION_ERROR');
    if (departmentId || positionId) throw new AppError('Super admin accounts cannot have company department or position', 422, 'VALIDATION_ERROR');
    return;
  }
  if (!companyId) throw new AppError('A company is required for this role', 422, 'VALIDATION_ERROR');
  const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null }, select: { id: true } });
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId }, select: { id: true } });
    if (!department) throw new AppError('Department not found for the selected company', 404, 'NOT_FOUND');
  }
  if (positionId) {
    const position = await prisma.position.findFirst({ where: { id: positionId, companyId }, select: { id: true } });
    if (!position) throw new AppError('Position not found for the selected company', 404, 'NOT_FOUND');
  }
}

async function assertNotLastActiveSuperAdmin(tx, target) {
  if (target.role?.name !== 'SUPER_ADMIN' || target.status !== 'ACTIVE') return;
  const activeSuperAdmins = await tx.user.count({
    where: { deletedAt: null, status: 'ACTIVE', role: { name: 'SUPER_ADMIN' } },
  });
  if (activeSuperAdmins <= 1) {
    throw new AppError('The last active super admin cannot be disabled, demoted, or deleted', 409, 'LAST_SUPER_ADMIN');
  }
}

export async function getPlatformDashboard(actingUser) {
  assertSuperAdmin(actingUser);
  const [totalCompanies, activeCompanies, suspendedCompanies, totalUsers, activeUsers,
    superAdmins, companyAdmins, instructors, employees, totalCourses, publishedCourses,
    totalEnrollments, recentUsers, recentActivity, recentCompanies] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.company.count({ where: { deletedAt: null, status: 'SUSPENDED' } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.user.count({ where: { deletedAt: null, role: { name: 'SUPER_ADMIN' } } }),
    prisma.user.count({ where: { deletedAt: null, role: { name: 'COMPANY_ADMIN' } } }),
    prisma.user.count({ where: { deletedAt: null, role: { name: 'INSTRUCTOR' } } }),
    prisma.user.count({ where: { deletedAt: null, role: { name: 'EMPLOYEE' } } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.course.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
    prisma.enrollment.count({ where: { course: { deletedAt: null } } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: PLATFORM_USER_SELECT,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, action: true, entity: true, entityId: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, slug: true, status: true, subscriptionPlan: true, createdAt: true },
    }),
  ]);

  const recentCompanyIds = recentCompanies.map((company) => company.id);
  const userCounts = recentCompanyIds.length
    ? await prisma.user.groupBy({
      by: ['companyId'],
      where: { deletedAt: null, companyId: { in: recentCompanyIds } },
      _count: { _all: true },
    })
    : [];
  const countByCompany = new Map(userCounts.map((row) => [row.companyId, row._count._all]));

  return {
    metrics: {
      totalCompanies, activeCompanies, suspendedCompanies,
      totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers,
      superAdmins, companyAdmins, instructors, employees,
      totalCourses, publishedCourses, totalEnrollments,
    },
    recentUsers,
    recentActivity,
    recentCompanies: recentCompanies.map((company) => ({ ...company, userCount: countByCompany.get(company.id) || 0 })),
  };
}

export async function listPlatformUsers(actingUser, query = {}) {
  assertSuperAdmin(actingUser);
  const { page, limit, skip } = parsePage(query);
  const where = { deletedAt: null };
  if (query.role) {
    validateStatus(query.role, USER_ROLES, 'role');
    where.role = { name: query.role };
  }
  if (query.status) {
    validateStatus(query.status, USER_STATUSES, 'user status');
    where.status = query.status;
  }
  if (query.companyId) where.companyId = query.companyId;
  if (query.search) {
    const search = String(query.search).trim().slice(0, 120);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
  }
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: PLATFORM_USER_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function listPlatformCompanies(actingUser, query = {}) {
  assertSuperAdmin(actingUser);
  const { page, limit, skip } = parsePage({ ...query, limit: query.limit || 50 });
  const where = { deletedAt: null };
  if (query.status) {
    validateStatus(query.status, COMPANY_STATUSES, 'company status');
    where.status = query.status;
  }
  if (query.search) {
    const search = String(query.search).trim().slice(0, 120);
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      select: { id: true, name: true, slug: true, email: true, industry: true, status: true, subscriptionPlan: true, createdAt: true },
    }),
  ]);
  const companyIds = companies.map((company) => company.id);
  const userCounts = companyIds.length
    ? await prisma.user.groupBy({ by: ['companyId'], where: { deletedAt: null, companyId: { in: companyIds } }, _count: { _all: true } })
    : [];
  const usersByCompany = new Map(userCounts.map((row) => [row.companyId, row._count._all]));
  return {
    data: companies.map((company) => ({ ...company, userCount: usersByCompany.get(company.id) || 0 })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function createPlatformUser(actingUser, input) {
  assertSuperAdmin(actingUser);
  const roleName = input.role;
  const role = await getRoleOrThrow(roleName);
  if (roleName === 'SUPER_ADMIN' && (input.companyId || input.departmentId || input.positionId)) {
    throw new AppError('Super admin accounts must not include company, department, or position assignments', 422, 'VALIDATION_ERROR');
  }
  const companyId = roleName === 'SUPER_ADMIN' ? null : (input.companyId || null);
  const departmentId = roleName === 'SUPER_ADMIN' ? null : (input.departmentId || null);
  const positionId = roleName === 'SUPER_ADMIN' ? null : (input.positionId || null);
  await validateCompanyAndRelations(companyId, departmentId, positionId, roleName);

  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }
  const employeeNumber = input.employeeNumber?.trim() || null;
  if (companyId && employeeNumber && await prisma.user.findFirst({ where: { companyId, employeeNumber }, select: { id: true } })) {
    throw new AppError('This employee number is already used in the selected company', 409, 'EMPLOYEE_NUMBER_TAKEN');
  }
  const password = await hashPassword(input.password);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name.trim(), email, password, roleId: role.id, companyId,
        departmentId, positionId, employeeNumber,
        status: input.status || 'ACTIVE',
      },
      select: PLATFORM_USER_SELECT,
    });
    await logActivity(tx, {
      userId: actingUser.id, companyId,
      action: 'PLATFORM_USER_CREATED', entity: 'USER', entityId: user.id,
      metadata: { role: roleName, email, targetCompanyId: companyId },
    });
    return user;
  });
  return created;
}

export async function updatePlatformUser(actingUser, userId, input) {
  assertSuperAdmin(actingUser);
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { ...PLATFORM_USER_SELECT, deletedAt: true },
  });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');

  const nextRoleName = input.role || existing.role.name;
  if (!USER_ROLES.includes(nextRoleName)) throw new AppError('Invalid user role', 422, 'VALIDATION_ERROR');
  const role = nextRoleName === existing.role.name ? existing.role : await getRoleOrThrow(nextRoleName);
  let nextCompanyId = Object.hasOwn(input, 'companyId') ? (input.companyId || null) : existing.companyId;
  if (nextRoleName === 'SUPER_ADMIN') {
    if (Object.hasOwn(input, 'companyId') && input.companyId) {
      throw new AppError('Super admin accounts must not belong to a company', 422, 'VALIDATION_ERROR');
    }
    nextCompanyId = null;
  } else if (!nextCompanyId) {
    throw new AppError('A company is required for this role', 422, 'VALIDATION_ERROR');
  }

  const companyChanged = nextCompanyId !== existing.companyId;
  const departmentId = nextRoleName === 'SUPER_ADMIN'
    ? null
    : (Object.hasOwn(input, 'departmentId') ? (input.departmentId || null) : (companyChanged ? null : existing.departmentId));
  const positionId = nextRoleName === 'SUPER_ADMIN'
    ? null
    : (Object.hasOwn(input, 'positionId') ? (input.positionId || null) : (companyChanged ? null : existing.positionId));
  await validateCompanyAndRelations(nextCompanyId, departmentId, positionId, nextRoleName);

  const nextStatus = input.status || existing.status;
  validateStatus(nextStatus, USER_STATUSES, 'user status');
  const changesOwnPrivilege = existing.id === actingUser.id && (
    nextRoleName !== existing.role.name || nextStatus !== existing.status || nextCompanyId !== existing.companyId
  );
  if (changesOwnPrivilege) throw new AppError('You cannot change your own role, status, or company assignment', 403, 'FORBIDDEN');

  if (input.email && input.email.trim().toLowerCase() !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, select: { id: true } });
    if (duplicate) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }
  const nextEmployeeNumber = Object.hasOwn(input, 'employeeNumber') ? (input.employeeNumber?.trim() || null) : existing.employeeNumber;
  if (nextCompanyId && nextEmployeeNumber && (companyChanged || nextEmployeeNumber !== existing.employeeNumber) && await prisma.user.findFirst({
    where: { id: { not: userId }, companyId: nextCompanyId, employeeNumber: nextEmployeeNumber }, select: { id: true },
  })) {
    throw new AppError('This employee number is already used in the selected company', 409, 'EMPLOYEE_NUMBER_TAKEN');
  }
  if (existing.role.name === 'SUPER_ADMIN' && existing.status === 'ACTIVE' && (nextRoleName !== 'SUPER_ADMIN' || nextStatus !== 'ACTIVE')) {
    if (existing.id === actingUser.id) throw new AppError('You cannot disable or demote your own super admin account', 403, 'FORBIDDEN');
  }

  const data = {};
  if (Object.hasOwn(input, 'name')) data.name = input.name.trim();
  if (Object.hasOwn(input, 'email')) data.email = input.email.trim().toLowerCase();
  if (Object.hasOwn(input, 'employeeNumber')) data.employeeNumber = input.employeeNumber?.trim() || null;
  if (Object.hasOwn(input, 'status')) data.status = input.status;
  if (Object.hasOwn(input, 'password') && input.password) data.password = await hashPassword(input.password);
  if (nextRoleName !== existing.role.name) data.roleId = role.id;
  if (nextCompanyId !== existing.companyId) data.companyId = nextCompanyId;
  if (departmentId !== existing.departmentId) data.departmentId = departmentId;
  if (positionId !== existing.positionId) data.positionId = positionId;

  const updated = await prisma.$transaction(async (tx) => {
    // Serialize administrative changes with password-reset consumption, which
    // locks the same user row before deciding whether a token remains valid.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { ...PLATFORM_USER_SELECT, deletedAt: true },
    });
    if (!current || current.deletedAt) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (current.id === actingUser.id && (
      (input.role && input.role !== current.role.name)
      || (input.status && input.status !== current.status)
      || (Object.hasOwn(input, 'companyId') && (input.companyId || null) !== current.companyId)
    )) {
      throw new AppError('You cannot change your own role, status, or company assignment', 403, 'FORBIDDEN');
    }
    const effectiveRoleName = input.role || current.role.name;
    const effectiveCompanyId = effectiveRoleName === 'SUPER_ADMIN'
      ? null
      : (Object.hasOwn(input, 'companyId') ? (input.companyId || null) : current.companyId);
    const effectiveStatus = input.status || current.status;
    const emailChanged = Object.hasOwn(input, 'email') && input.email.trim().toLowerCase() !== current.email;
    const accessPropertiesChanged = Boolean(input.password) || emailChanged
      || effectiveRoleName !== current.role.name || effectiveCompanyId !== current.companyId || effectiveStatus !== current.status;
    if (current.role.name === 'SUPER_ADMIN' && current.status === 'ACTIVE' && (effectiveRoleName !== 'SUPER_ADMIN' || effectiveStatus !== 'ACTIVE')) {
      await assertNotLastActiveSuperAdmin(tx, current);
    }
    const user = await tx.user.update({ where: { id: userId }, data, select: PLATFORM_USER_SELECT });
    if (accessPropertiesChanged) {
      const revokedAt = new Date();
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt } });
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: revokedAt },
      });
    }
    await logActivity(tx, {
      userId: actingUser.id,
      companyId: nextCompanyId || existing.companyId,
      action: 'PLATFORM_USER_UPDATED', entity: 'USER', entityId: userId,
      metadata: {
        fields: Object.keys(input).filter((field) => field !== 'password'),
        fromRole: existing.role.name,
        toRole: nextRoleName,
      },
    });
    return user;
  });
  return updated;
}

export async function deletePlatformUser(actingUser, userId) {
  assertSuperAdmin(actingUser);
  if (actingUser.id === userId) throw new AppError('You cannot delete your own account', 403, 'FORBIDDEN');
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, name: true, email: true, status: true, companyId: true, role: { select: { name: true } } },
  });
  if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await assertNotLastActiveSuperAdmin(tx, existing);
    await tx.user.update({ where: { id: userId }, data: { status: 'INACTIVE', deletedAt: now } });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await logActivity(tx, {
      userId: actingUser.id, companyId: existing.companyId,
      action: 'PLATFORM_USER_DELETED', entity: 'USER', entityId: userId,
      metadata: { email: existing.email, role: existing.role.name, softDelete: true },
    });
  });
  return { id: userId, deleted: true };
}

export async function updateCompanyStatus(actingUser, companyId, status) {
  assertSuperAdmin(actingUser);
  validateStatus(status, COMPANY_STATUSES, 'company status');
  const existing = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null }, select: { id: true, name: true, status: true } });
  if (!existing) throw new AppError('Company not found', 404, 'NOT_FOUND');
  return prisma.$transaction(async (tx) => {
    // A status change rotates the tenant's dedicated authorization epoch even
    // on reactivation; unrelated company profile edits do not affect access JWTs.
    const lockedCompany = await tx.$queryRaw`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`;
    const current = await tx.company.findFirst({ where: { id: companyId, deletedAt: null }, select: { id: true, name: true, status: true } });
    if (!lockedCompany.length || !current) throw new AppError('Company not found', 404, 'NOT_FOUND');
    if (current.status === status) return current;
    const company = await tx.company.update({
      where: { id: companyId },
      data: { status, securityVersion: { increment: 1 } },
      select: { id: true, name: true, status: true },
    });
    const revoked = await tx.refreshToken.updateMany({
      where: { revokedAt: null, user: { companyId } },
      data: { revokedAt: new Date() },
    });
    await logActivity(tx, {
      userId: actingUser.id, companyId,
      action: 'COMPANY_STATUS_CHANGED', entity: 'COMPANY', entityId: companyId,
      metadata: { from: existing.status, to: status, securityAction: 'ACTIVE_REFRESH_SESSIONS_REVOKED', revokedSessionCount: revoked.count },
    });
    return { id: company.id, name: company.name, status: company.status };
  });
}

export default {
  getPlatformDashboard,
  listPlatformUsers,
  listPlatformCompanies,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  updateCompanyStatus,
};
