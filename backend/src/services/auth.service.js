import prisma from '../config/db.js';
import env from '../config/env.js';
import authConfig from '../config/auth.config.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateSecureToken, hashToken, addSeconds } from '../utils/token.js';
import { logActivity } from '../utils/activityLog.js';
import { slugify, uniqueSlug } from '../utils/slugify.js';
import mailService from './mail.service.js';

/** Fields safe to ever send to the frontend. Never includes password. */
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  status: true,
  employeeNumber: true,
  lastLoginAt: true,
  emailVerifiedAt: true,
  companyId: true,
  role: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, slug: true, status: true } },
};

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    status: user.status,
    employeeNumber: user.employeeNumber,
    lastLoginAt: user.lastLoginAt,
    emailVerified: Boolean(user.emailVerifiedAt),
    role: user.role?.name,
    department: user.department,
    position: user.position,
    company: user.company,
  };
}

/** Issues a fresh access + refresh token pair for an already-validated user. */
async function issueSession(user) {
  const accessToken = signAccessToken({ id: user.id, role: user.role.name, companyId: user.companyId });
  const rawRefreshToken = generateSecureToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: addSeconds(new Date(), authConfig.refreshToken.expiresInSeconds),
    },
  });
  return { accessToken, rawRefreshToken };
}

const invalidCredentials = () => new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');

export async function login({ username, email, password }) {
  // The current database uses the globally unique `email` column as its login
  // identifier. Accept both API names so existing clients remain compatible,
  // while the public login contract can use username/password terminology.
  const loginIdentifier = username ?? email;
  const user = await prisma.user.findUnique({
    where: { email: loginIdentifier },
    select: { ...SAFE_USER_SELECT, password: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    // Same generic error whether or not the email exists — no account
    // enumeration via the login endpoint.
    throw invalidCredentials();
  }

  const passwordValid = await verifyPassword(user.password, password);
  if (!passwordValid) {
    await logActivity(prisma, {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      metadata: { reason: 'invalid_password' },
    });
    throw invalidCredentials();
  }

  if (user.status !== 'ACTIVE') {
    await logActivity(prisma, {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      metadata: { reason: 'account_inactive' },
    });
    throw new AppError('Your account is not active. Contact your administrator.', 401, 'ACCOUNT_INACTIVE');
  }

  if (user.company && user.company.status === 'SUSPENDED' && user.role.name !== 'SUPER_ADMIN') {
    await logActivity(prisma, {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      metadata: { reason: 'company_suspended' },
    });
    throw new AppError('Your company account is suspended.', 401, 'COMPANY_SUSPENDED');
  }

  const { accessToken, rawRefreshToken } = await issueSession(user);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LOGIN_SUCCESS', entity: 'AUTH' });

  return { user: toPublicUser(user), accessToken, refreshToken: rawRefreshToken };
}

export async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (token && !token.revokedAt) {
    await prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    await logActivity(prisma, { userId: token.userId, action: 'LOGOUT', entity: 'AUTH' });
  }
}

export async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new AppError('Invalid session', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (existing.revokedAt) {
    // Reuse of an already-rotated/revoked token is a strong signal of
    // token theft — kill every other active session for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logActivity(prisma, {
      userId: existing.userId,
      action: 'REFRESH_TOKEN_REVOKED',
      entity: 'AUTH',
      metadata: { reason: 'reuse_detected' },
    });
    throw new AppError('Session invalid. Please log in again.', 401, 'REFRESH_TOKEN_REUSE_DETECTED');
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError('Session expired. Please log in again.', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: SAFE_USER_SELECT });
  const companySuspended = user?.company && user.company.status === 'SUSPENDED' && user.role.name !== 'SUPER_ADMIN';
  if (!user || user.status !== 'ACTIVE' || companySuspended) {
    throw new AppError('Account no longer accessible', 401, 'UNAUTHORIZED');
  }

  const rawNewRefreshToken = generateSecureToken();
  const newTokenHash = hashToken(rawNewRefreshToken);

  const createdToken = await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: addSeconds(new Date(), authConfig.refreshToken.expiresInSeconds),
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: created.id },
    });
    return created;
  });
  void createdToken;

  const accessToken = signAccessToken({ id: user.id, role: user.role.name, companyId: user.companyId });

  return { user: toPublicUser(user), accessToken, refreshToken: rawNewRefreshToken };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return toPublicUser(user);
}

export async function registerCompany({ companyName, adminName, email, password }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const companyAdminRole = await prisma.role.findUnique({ where: { name: 'COMPANY_ADMIN' } });
  if (!companyAdminRole) {
    throw new AppError('Platform roles are not initialized. Run the database seed first.', 500, 'ROLES_NOT_SEEDED');
  }

  const passwordHash = await hashPassword(password);
  const baseSlug = slugify(companyName);

  // Transaction: if user creation fails after the company is created, the
  // whole thing rolls back — never leave a company with no admin.
  const { companyId, adminUserId } = await prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx.company, baseSlug);
    const company = await tx.company.create({
      data: { name: companyName, slug, email, status: 'ACTIVE', subscriptionPlan: 'FREE' },
    });
    const adminUser = await tx.user.create({
      data: {
        companyId: company.id,
        roleId: companyAdminRole.id,
        name: adminName,
        email,
        password: passwordHash,
        employeeNumber: 'EMP-000',
        status: 'ACTIVE',
      },
    });
    return { companyId: company.id, adminUserId: adminUser.id };
  });

  const fullUser = await prisma.user.findUnique({ where: { id: adminUserId }, select: SAFE_USER_SELECT });
  const { accessToken, rawRefreshToken } = await issueSession(fullUser);

  await logActivity(prisma, {
    userId: adminUserId,
    companyId,
    action: 'REGISTER_COMPANY',
    entity: 'COMPANY',
    entityId: companyId,
  });

  // Verification architecture is wired (§26) even though it isn't required
  // to complete registration in this MVP — company admins can use the
  // platform immediately, then verify at their own pace.
  const rawVerifyToken = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: adminUserId,
      tokenHash: hashToken(rawVerifyToken),
      expiresAt: addSeconds(new Date(), authConfig.emailVerificationToken.expiresInSeconds),
    },
  });
  await mailService.sendVerificationEmail(email, `${env.clientUrl}/verify-email?token=${rawVerifyToken}`);

  return { user: toPublicUser(fullUser), accessToken, refreshToken: rawRefreshToken };
}

export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  // No branch here reveals whether the account exists — the controller
  // always returns the same generic message regardless of what happens
  // inside this function.
  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    return;
  }

  const rawToken = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: addSeconds(new Date(), authConfig.passwordResetToken.expiresInSeconds),
    },
  });

  await mailService.sendPasswordResetEmail(user.email, `${env.clientUrl}/reset-password?token=${rawToken}`);
  await logActivity(prisma, {
    userId: user.id,
    companyId: user.companyId,
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'AUTH',
  });
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: resetToken.userId }, data: { password: passwordHash } });
    await tx.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
    // A password reset invalidates every existing session, including
    // whatever session an attacker with the old password might hold.
    await tx.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await logActivity(prisma, { userId: resetToken.userId, action: 'PASSWORD_RESET_COMPLETED', entity: 'AUTH' });
}

export async function verifyEmail(token) {
  const tokenHash = hashToken(token);
  const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
    throw new AppError('This verification link is invalid or has expired', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: verificationToken.userId }, data: { emailVerifiedAt: new Date() } });
    await tx.emailVerificationToken.update({ where: { id: verificationToken.id }, data: { usedAt: new Date() } });
  });

  await logActivity(prisma, { userId: verificationToken.userId, action: 'EMAIL_VERIFIED', entity: 'AUTH' });
}

export async function resendVerification(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.emailVerifiedAt) {
    return; // Same no-op-looking response whether unknown, deleted, or already verified.
  }

  const rawToken = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: addSeconds(new Date(), authConfig.emailVerificationToken.expiresInSeconds),
    },
  });
  await mailService.sendVerificationEmail(user.email, `${env.clientUrl}/verify-email?token=${rawToken}`);
}

export default {
  login,
  logout,
  refreshSession,
  getCurrentUser,
  registerCompany,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
