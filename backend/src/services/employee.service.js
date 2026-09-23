import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { generateSecureToken } from '../utils/token.js';
import { logActivity } from '../utils/activityLog.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import mailService from './mail.service.js';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  employeeNumber: true,
  status: true,
  companyId: true,
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
export async function createEmployee(actingUser, { name, email, departmentId, positionId, employeeNumber, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
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

  const temporaryPassword = generateSecureToken().slice(0, 12);
  const passwordHash = await hashPassword(temporaryPassword);

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

  await mailService.sendEmployeeInvitationEmail(email, temporaryPassword);
  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'CREATE',
    entity: 'USER',
    entityId: employee.id,
    metadata: { email },
  });

  return employee;
}

export async function listEmployees(actingUser) {
  return prisma.user.findMany({
    where: { companyId: actingUser.companyId, deletedAt: null },
    select: SAFE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
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

export default { createEmployee, listEmployees, getEmployeeById };
