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
  company: { select: { id: true, name: true, slug: true, status: true, securityVersion: true } },
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
  const accessToken = signAccessToken({ id: user.id, role: user.role.name, companyId: user.companyId, company: user.company });
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
  // Registration stores normalized emails, so login must normalize identically.
  const loginIdentifier = (username ?? email).trim().toLowerCase();
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

  if (user.company && user.company.status !== 'ACTIVE' && user.role.name !== 'SUPER_ADMIN') {
    await logActivity(prisma, {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN_FAILED',
      entity: 'AUTH',
      metadata: { reason: 'company_not_active' },
    });
    throw new AppError('Your company account is not active.', 401, 'COMPANY_NOT_ACTIVE');
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
  const companySuspended = user?.company && user.company.status !== 'ACTIVE' && user.role.name !== 'SUPER_ADMIN';
  if (!user || user.status !== 'ACTIVE' || companySuspended) {
    throw new AppError('Account no longer accessible', 401, 'UNAUTHORIZED');
  }

  const rawNewRefreshToken = generateSecureToken();
  const newTokenHash = hashToken(rawNewRefreshToken);

  const createdToken = await prisma.$transaction(async (tx) => {
    const rotated = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (rotated.count !== 1) {
      throw new AppError('Session invalid. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
    }
    const created = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: addSeconds(new Date(), authConfig.refreshToken.expiresInSeconds),
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { replacedByTokenId: created.id },
    });
    return created;
  });
  void createdToken;

  const accessToken = signAccessToken({ id: user.id, role: user.role.name, companyId: user.companyId, company: user.company });

  return { user: toPublicUser(user), accessToken, refreshToken: rawNewRefreshToken };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return toPublicUser(user);
}

export async function registerCompany({ companyName, companyEmail, companySlug, adminName, email, password, confirmPassword }) {
  if (typeof email !== 'string' || typeof companyEmail !== 'string') {
    throw new AppError('Company and administrator email are required', 422, 'VALIDATION_ERROR', {
      companyEmail: 'Company email is required',
      email: 'Administrator email is required',
    });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompanyEmail = companyEmail.trim().toLowerCase();
  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 422, 'VALIDATION_ERROR', { confirmPassword: 'Passwords do not match' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }
  const baseSlug = slugify(companySlug || companyName || '');
  if (baseSlug.length < 2) {
    throw new AppError('Company identifier must contain at least 2 letters or numbers', 422, 'VALIDATION_ERROR', { companySlug: 'Company identifier is invalid' });
  }
  if (companySlug && await prisma.company.findUnique({ where: { slug: baseSlug }, select: { id: true } })) {
    throw new AppError('A company with this identifier already exists', 409, 'COMPANY_SLUG_TAKEN');
  }

  const companyAdminRole = await prisma.role.findUnique({ where: { name: 'COMPANY_ADMIN' } });
  if (!companyAdminRole) {
    throw new AppError('System roles are not initialized. Run `npm run db:init-roles` before accepting registrations.', 500, 'ROLES_NOT_SEEDED');
  }

  const passwordHash = await hashPassword(password);

  // The preflight checks produce friendly messages; the unique indexes remain
  // authoritative if concurrent registrations race. A failed create rolls back
  // the entire transaction, including its newly inserted company. Conflicts
  // are mapped to readable errors below instead of leaking Prisma details.
  let companyId;
  let adminUserId;
  try {
    ({ companyId, adminUserId } = await prisma.$transaction(async (tx) => {
      const slug = companySlug ? baseSlug : await uniqueSlug(tx.company, baseSlug);
      const company = await tx.company.create({
        data: { name: companyName, slug, email: normalizedCompanyEmail, status: 'ACTIVE', subscriptionPlan: 'FREE' },
      });
      const adminUser = await tx.user.create({
        data: {
          companyId: company.id,
          roleId: companyAdminRole.id,
          name: adminName,
          email: normalizedEmail,
          password: passwordHash,
          status: 'ACTIVE',
        },
      });
      return { companyId: company.id, adminUserId: adminUser.id };
    }));
  } catch (error) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(' ') : String(error.meta?.target || '');
      if (target.includes('slug')) {
        throw new AppError('A company with this identifier already exists', 409, 'COMPANY_SLUG_TAKEN');
      }
      if (target.includes('email')) {
        throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
      }
      throw new AppError('A registration identifier is already in use', 409, 'REGISTRATION_CONFLICT');
    }
    throw error;
  }

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
  await mailService.sendVerificationEmail(normalizedEmail, `${env.clientUrl}/verify-email?token=${rawVerifyToken}`);

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
  // Hashing is intentionally outside the transaction to keep the row lock brief.
  // The token's usedAt compare-and-set inside the transaction is authoritative:
  // competing reset/admin requests cannot both consume the same token.
  const tokenHash = hashToken(token);
  const preliminary = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!preliminary || preliminary.usedAt || preliminary.expiresAt < new Date()) {
    throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  }
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    // Lock the account row before validating/consuming the token. Admin credential
    // updates take the same lock, so whichever request wins defines ordering.
    const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken) {
      throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
    }
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${resetToken.userId} FOR UPDATE`;
    const currentToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    const lockedUser = await tx.user.findUnique({ where: { id: resetToken.userId }, select: { status: true, deletedAt: true } });
    if (!currentToken || currentToken.usedAt || currentToken.expiresAt < new Date()
      || !lockedUser || lockedUser.deletedAt || lockedUser.status !== 'ACTIVE') {
      throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
    }

    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
    }
    await tx.user.update({ where: { id: resetToken.userId }, data: { password: passwordHash } });
    // A password reset invalidates every existing session, including
    // whatever session an attacker with the old password might hold.
    await tx.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logActivity(tx, { userId: resetToken.userId, action: 'PASSWORD_RESET_COMPLETED', entity: 'AUTH' });
  });
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
