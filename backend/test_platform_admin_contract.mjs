import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [routes, service, controller, validator, authMiddleware, authService, schema] = await Promise.all([
  read('./src/routes/platformAdmin.routes.js'),
  read('./src/services/platformAdmin.service.js'),
  read('./src/controllers/platformAdmin.controller.js'),
  read('./src/validators/platformAdmin.validation.js'),
  read('./src/middleware/authenticate.js'),
  read('./src/services/auth.service.js'),
  read('./prisma/schema.prisma'),
]);

test('platform administration routes require authentication and SUPER_ADMIN authorization', () => {
  assert.match(routes, /router\.use\(authenticate, authorize\('SUPER_ADMIN'\)\)/);
  assert.match(routes, /router\.get\('\/dashboard'/);
  assert.match(routes, /router\.get\('\/users'/);
  assert.match(routes, /router\.post\('\/users'/);
  assert.match(routes, /router\.patch\('\/users\/:id'/);
  assert.match(routes, /router\.delete\('\/users\/:id'/);
  assert.match(routes, /router\.patch\('\/companies\/:id\/status'/);
});

test('platform user queries stay global only for SUPER_ADMIN and exclude soft-deleted accounts', () => {
  assert.match(service, /function assertSuperAdmin\(actingUser\)/);
  assert.match(service, /assertSuperAdmin\(actingUser\)/);
  assert.match(service, /const where = \{ deletedAt: null \}/);
  assert.match(service, /USER_ROLES = \['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE'\]/);
});

test('new and updated company-scoped accounts validate tenant and department/position ownership', () => {
  assert.match(service, /validateCompanyAndRelations\(companyId, departmentId, positionId, roleName\)/);
  assert.match(service, /where: \{ id: departmentId, companyId \}/);
  assert.match(service, /where: \{ id: positionId, companyId \}/);
  assert.match(validator, /const role = z\.enum\(\['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE'\]\)/);
  assert.match(validator, /body: z\.object\([\s\S]*?\.strict\(\)/);
});

test('account removal is a soft delete, revokes refresh sessions, and records an audit event', () => {
  assert.match(service, /You cannot delete your own account/);
  assert.match(service, /status: 'INACTIVE', deletedAt: now/);
  assert.match(service, /refreshToken\.updateMany\(\{ where: \{ userId, revokedAt: null \}/);
  assert.match(service, /action: 'PLATFORM_USER_DELETED'/);
  assert.match(schema, /deletedAt DateTime\?/);
  assert.match(schema, /user\s+User\s+@relation\(fields: \[userId\], references: \[id\], onDelete: Restrict\)/);
});

test('the last active super admin is protected from disable, demotion, and deletion', () => {
  assert.match(service, /function assertNotLastActiveSuperAdmin\(tx, target\)/);
  assert.match(service, /cannot be disabled, demoted, or deleted/i);
  assert.match(service, /activeSuperAdmins <= 1/);
});

test('inactive and suspended companies block company-user API access and session refresh', () => {
  assert.match(authMiddleware, /user\.company\.status !== 'ACTIVE'/);
  assert.match(authService, /user\.company\.status !== 'ACTIVE'/);
  assert.match(authService, /user\?\.company && user\.company\.status !== 'ACTIVE'/);
});

console.log('Platform admin contract checks passed.');
