import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env'),
});

function parseSafeTestDatabaseUrl() {
  const connectionString = process.env.SECURITY_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('SECURITY_TEST_DATABASE_URL must be explicitly configured.');
  }

  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('SECURITY_TEST_DATABASE_URL is invalid.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Security integration tests require a PostgreSQL database.');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const safeIdentity = `${parsed.hostname}/${database}`.toLowerCase();
  if (!database || /(^|[\W_-])(prod|production|live)([\W_-]|$)/.test(safeIdentity)) {
    throw new Error('Refusing an unnamed or production-like security test database.');
  }
  if (/^(postgres|template0|template1|lms|lms[_-]dev|lms[_-]development)$/i.test(database)) {
    throw new Error('Refusing a system or known application development database.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run database integration tests in production mode.');
  }
  return { connectionString, database, identity: safeIdentity };
}

function assertDifferentFromApplicationDatabase(testDb) {
  const applicationConnection = process.env.DATABASE_URL;
  if (!applicationConnection) {
    throw new Error('DATABASE_URL must be configured so test-database isolation can be confirmed.');
  }

  let applicationUrl;
  try {
    applicationUrl = new URL(applicationConnection);
  } catch {
    throw new Error('Configured application database URL is invalid; cannot verify test isolation.');
  }
  const applicationDatabase = decodeURIComponent(applicationUrl.pathname.replace(/^\//, ''));
  const testUrl = new URL(testDb.connectionString);
  if (applicationUrl.hostname.toLowerCase() === testUrl.hostname.toLowerCase()
    && applicationUrl.port === testUrl.port
    && applicationDatabase.toLowerCase() === testDb.database.toLowerCase()) {
    throw new Error('Security test database must differ from the configured application database.');
  }
  if (/^(lms|lms[_-]dev|lms[_-]development)$/i.test(applicationDatabase)) {
    throw new Error('Refusing to run against the known application development database.');
  }
}

function token() {
  return randomBytes(32).toString('hex');
}

function assertOk(value, message) {
  assert.ok(value, message);
}

async function authStatus(authenticate, accessToken) {
  return new Promise((resolve) => {
    const req = {
      headers: { authorization: `Bearer ${accessToken}` },
    };
    const res = {};
    authenticate(req, res, (error) => {
      resolve(error?.statusCode ?? 200);
    });
  });
}

async function run() {
  const testDb = parseSafeTestDatabaseUrl();
  assertDifferentFromApplicationDatabase(testDb);
  // Services import the shared Prisma singleton, so point it at the validated
  // test datasource before any DB-dependent module is loaded.
  process.env.DATABASE_URL = testDb.connectionString;

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || accessSecret.length < 16 || !refreshSecret || refreshSecret.length < 16) {
    throw new Error('Integration tests require configured JWT secrets of sufficient length.');
  }

  // The application Prisma singleton will inherit this verified test datasource.
  process.env.DATABASE_URL = testDb.connectionString;
  const { default: prisma } = await import('./src/config/db.js');

  let companyIds = [];
  let userIds = [];
  let resetTokenHashes = [];
  let refreshTokenHashes = [];
  try {
    const connectionCheck = await prisma.$queryRaw`SELECT current_database() AS database_name`;
    if (String(connectionCheck[0]?.database_name).toLowerCase() !== testDb.database.toLowerCase()) {
      throw new Error('Connected PostgreSQL database does not match SECURITY_TEST_DATABASE_URL.');
    }

    const [superAdminRole, employeeRole] = await Promise.all([
      prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } }),
      prisma.role.findUnique({ where: { name: 'EMPLOYEE' } }),
    ]);
    if (!superAdminRole || !employeeRole) {
      throw new Error('Required SUPER_ADMIN and EMPLOYEE roles are missing from the isolated test database.');
    }

    const suffix = randomBytes(8).toString('hex');
    const companyA = await prisma.company.create({
      data: { name: `Security Test A ${suffix}`, slug: `security-test-a-${suffix}`, status: 'ACTIVE' },
    });
    companyIds.push(companyA.id);
    const companyB = await prisma.company.create({
      data: { name: `Security Test B ${suffix}`, slug: `security-test-b-${suffix}`, status: 'ACTIVE' },
    });
    companyIds.push(companyB.id);

    const { hashPassword } = await import('./src/utils/password.js');
    const initialPasswordHash = await hashPassword(`InitialPassA1-${suffix}`);
    const superAdmin = await prisma.user.create({
      data: {
        name: `Security Admin ${suffix}`,
        email: `security-admin-${suffix}@example.test`,
        password: initialPasswordHash,
        roleId: superAdminRole.id,
        status: 'ACTIVE',
      },
    });
    userIds.push(superAdmin.id);
    const employee = await prisma.user.create({
      data: {
        name: `Security Employee ${suffix}`,
        email: `security-employee-${suffix}@example.test`,
        password: initialPasswordHash,
        roleId: employeeRole.id,
        companyId: companyA.id,
        status: 'ACTIVE',
      },
    });
    userIds.push(employee.id);
    const unrelatedEmployee = await prisma.user.create({
      data: {
        name: `Unrelated Employee ${suffix}`,
        email: `security-unrelated-${suffix}@example.test`,
        password: initialPasswordHash,
        roleId: employeeRole.id,
        companyId: companyB.id,
        status: 'ACTIVE',
      },
    });
    userIds.push(unrelatedEmployee.id);

    const { resetPassword, refreshSession, login } = await import('./src/services/auth.service.js');
    const { updatePlatformUser, updateCompanyStatus } = await import('./src/services/platformAdmin.service.js');
    const { authenticate } = await import('./src/middleware/authenticate.js');
    const { hashToken } = await import('./src/utils/token.js');

    const validPassword = `TestPassA1-${suffix}`;
    const validPasswordHash = await hashPassword(validPassword);
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { password: validPasswordHash } });

    async function makeReset(userId) {
      const raw = token();
      const tokenHash = hashToken(raw);
      await prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt: new Date(Date.now() + 5 * 60_000) },
      });
      resetTokenHashes.push(tokenHash);
      return raw;
    }

    async function makeRefresh(userId) {
      const raw = token();
      const tokenHash = hashToken(raw);
      await prisma.refreshToken.create({
        data: { userId, tokenHash, expiresAt: new Date(Date.now() + 5 * 60_000) },
      });
      refreshTokenHashes.push(tokenHash);
      return raw;
    }

    function issueTenantAccess(user, company) {
      return jwt.sign({
        sub: user.id,
        role: 'EMPLOYEE',
        companyId: company.id,
        companySecurityVersion: company.securityVersion,
      }, accessSecret, { expiresIn: '5m' });
    }

    const adminActor = { id: superAdmin.id, role: 'SUPER_ADMIN' };

    // Ordinary reset is valid once; a Super Admin password change invalidates another outstanding reset token.
    const normalReset = await makeReset(employee.id);
    await resetPassword({ token: normalReset, password: `ResetPassA2-${suffix}` });
    await assert.rejects(
      resetPassword({ token: normalReset, password: `ResetPassB3-${suffix}` }),
      (error) => error.errorCode === 'INVALID_RESET_TOKEN',
    );

    const adminInvalidatedReset = await makeReset(employee.id);
    const adminPassword = `AdminPassB4-${suffix}`;
    await updatePlatformUser(adminActor, employee.id, { password: adminPassword });
    const invalidatedRow = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(adminInvalidatedReset) } });
    assertOk(invalidatedRow?.usedAt, 'administrative password update marked outstanding reset token invalid');
    await assert.rejects(
      resetPassword({ token: adminInvalidatedReset, password: `ResetPassC5-${suffix}` }),
      (error) => error.errorCode === 'INVALID_RESET_TOKEN',
    );

    // Two separately started requests contend on the same user-row lock; either order must leave a consumed reset token and a valid committed password.
    const racingReset = await makeReset(employee.id);
    const concurrentResults = await Promise.allSettled([
      resetPassword({ token: racingReset, password: `RaceResetD6-${suffix}` }),
      updatePlatformUser(adminActor, employee.id, { password: `RaceAdminE7-${suffix}` }),
    ]);
    assertOk(concurrentResults[1].status === 'fulfilled', 'administrative credential update committed during reset race');
    const racedTokenRow = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(racingReset) } });
    const racedUser = await prisma.user.findUnique({ where: { id: employee.id }, select: { password: true } });
    assertOk(Boolean(racedTokenRow?.usedAt), 'reset token is consumed or invalidated after the race');
    assertOk(Boolean(racedUser?.password), 'user retains a committed password after the race');
    assertOk(
      concurrentResults[0].status === 'fulfilled' || concurrentResults[0].reason?.errorCode === 'INVALID_RESET_TOKEN',
      'reset request either commits as the winner or rejects as invalid without a partial state',
    );

    // Company status transitions revoke refresh sessions and permanently invalidate prior access-token versions.
    const preTransitionCompany = await prisma.company.findUnique({ where: { id: companyA.id } });
    const oldAccessToken = issueTenantAccess(employee, preTransitionCompany);
    const transitionRefresh = await makeRefresh(employee.id);
    const unrelatedCompany = await prisma.company.findUnique({ where: { id: companyB.id } });
    const unrelatedAccessToken = issueTenantAccess(unrelatedEmployee, unrelatedCompany);
    await updateCompanyStatus(adminActor, companyA.id, 'SUSPENDED');
    const suspendedCompany = await prisma.company.findUnique({ where: { id: companyA.id } });
    assert.equal(suspendedCompany.securityVersion, preTransitionCompany.securityVersion + 1);
    await assert.rejects(refreshSession(transitionRefresh));
    await updateCompanyStatus(adminActor, companyA.id, 'ACTIVE');
    const reactivatedCompany = await prisma.company.findUnique({ where: { id: companyA.id } });
    assert.equal(reactivatedCompany.securityVersion, suspendedCompany.securityVersion + 1);
    assert.notEqual(await authStatus(authenticate, oldAccessToken), 200);
    await assert.rejects(refreshSession(transitionRefresh));
    assert.equal(await authStatus(authenticate, unrelatedAccessToken), 200);

    // Establish a known credential after the concurrent race, then test fresh login with that exact password.
    const freshLoginPassword = `FreshLoginF8-${suffix}`;
    await updatePlatformUser(adminActor, employee.id, { password: freshLoginPassword });
    const fresh = await login({ email: employee.email, password: freshLoginPassword });
    assert.equal(await authStatus(authenticate, fresh.accessToken), 200);
    refreshTokenHashes.push(hashToken(fresh.refreshToken));
    const afterLoginRefresh = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(fresh.refreshToken) } });
    assertOk(afterLoginRefresh && !afterLoginRefresh.revokedAt, 'fresh login refresh session is active');

    // Two refresh requests run concurrently with the same persisted token.
    const concurrentRefresh = await makeRefresh(employee.id);
    const refreshResults = await Promise.allSettled([
      refreshSession(concurrentRefresh),
      refreshSession(concurrentRefresh),
    ]);
    assert.ok(refreshResults.filter((result) => result.status === 'fulfilled').length <= 1);
    const oldRefreshRow = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(concurrentRefresh) } });
    assertOk(oldRefreshRow?.revokedAt, 'concurrent refresh token is revoked');
    const activeAfterRotation = await prisma.refreshToken.count({ where: { userId: employee.id, revokedAt: null } });
    assert.ok(activeAfterRotation >= 1, 'winning rotation (if any) leaves a coherent active session');

    // Disabled user and inactive company cannot regain access via refresh; unauthorized platform actions are rejected.
    const disabledUserRefresh = await makeRefresh(unrelatedEmployee.id);
    await prisma.user.update({ where: { id: unrelatedEmployee.id }, data: { status: 'INACTIVE' } });
    await assert.rejects(refreshSession(disabledUserRefresh));
    await prisma.company.update({ where: { id: companyB.id }, data: { status: 'SUSPENDED' } });
    await assert.rejects(login({ email: unrelatedEmployee.email, password: validPassword }));
    await assert.rejects(
      updateCompanyStatus({ id: employee.id, role: 'EMPLOYEE' }, companyB.id, 'ACTIVE'),
      (error) => error.statusCode === 403,
    );

    console.log('PostgreSQL security integration scenarios passed.');
  } finally {
    // Delete only rows owned by these UUID fixtures and their recorded opaque-token hashes.
    await prisma.$transaction(async (tx) => {
      await tx.activityLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.activityLog.deleteMany({
        where: { companyId: { in: companyIds } },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await tx.user.deleteMany({
        where: { id: { in: userIds } },
      });
      await tx.company.deleteMany({
        where: { id: { in: companyIds } },
      });
    });
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  // Never print error objects or database client diagnostics that might embed connection details.
  console.error(`Security integration test failed: ${error?.message || 'unknown error'}`);
  process.exitCode = 1;
});
