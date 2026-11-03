import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [platformService, authService, authMiddleware, jwt, schema, routes] = await Promise.all([
  read('./src/services/platformAdmin.service.js'),
  read('./src/services/auth.service.js'),
  read('./src/middleware/authenticate.js'),
  read('./src/utils/jwt.js'),
  read('./prisma/schema.prisma'),
  read('./src/routes/platformAdmin.routes.js'),
]);

test('administrative security-sensitive user changes revoke reset tokens and refresh sessions atomically', () => {
  const update = platformService.slice(platformService.indexOf('export async function updatePlatformUser'), platformService.indexOf('export async function deletePlatformUser'));
  assert.match(update, /await tx\.\$queryRaw`SELECT id FROM users WHERE id = \$\{userId\} FOR UPDATE`/);
  assert.match(update, /accessPropertiesChanged = Boolean\(input\.password\) \|\| emailChanged/);
  assert.match(update, /effectiveRoleName !== current\.role\.name \|\| effectiveCompanyId !== current\.companyId \|\| effectiveStatus !== current\.status/);
  assert.match(update, /tx\.passwordResetToken\.updateMany\([\s\S]*?where: \{ userId, usedAt: null \}/);
  assert.match(update, /tx\.refreshToken\.updateMany\([\s\S]*?where: \{ userId, revokedAt: null \}/);
  assert.match(update, /await logActivity\(tx/);
});

test('password reset preserves the established invalid-token response and atomically consumes one token', () => {
  const reset = authService.slice(authService.indexOf('export async function resetPassword'), authService.indexOf('export async function verifyEmail'));
  assert.match(reset, /'INVALID_RESET_TOKEN'/);
  assert.match(reset, /usedAt: null, expiresAt: \{ gt: new Date\(\) \}/);
  assert.match(reset, /consumed\.count !== 1/);
  assert.match(reset, /FOR UPDATE/);
  assert.match(reset, /tx\.refreshToken\.updateMany/);
  assert.match(reset, /logActivity\(tx/);
  assert.match(reset, /hashPassword\(password\)/);
});

test('company status transition atomically revokes tenant refresh sessions and records transition audit context', () => {
  const update = platformService.slice(platformService.indexOf('export async function updateCompanyStatus'), platformService.indexOf('export default'));
  assert.match(update, /assertSuperAdmin\(actingUser\)/);
  assert.match(update, /await tx\.company\.update/);
  assert.match(update, /securityVersion: \{ increment: 1 \}/);
  assert.match(update, /SELECT id FROM companies WHERE id = \$\{companyId\} FOR UPDATE/);
  assert.match(update, /tx\.refreshToken\.updateMany\([\s\S]*?user: \{ companyId \}/);
  assert.match(update, /metadata: \{ from: existing\.status, to: status, securityAction:/);
  assert.match(update, /revokedSessionCount: revoked\.count/);
  assert.match(routes, /router\.use\(authenticate, authorize\('SUPER_ADMIN'\)\)/);
});

test('company transition epoch is stamped into tenant JWTs and checked server-side on every protected endpoint', () => {
  assert.match(jwt, /companySecurityVersion: user\.companyId \? user\.company\?\.securityVersion \?\? null : null/);
  assert.match(authMiddleware, /company: \{ select: \{ id: true, status: true, securityVersion: true \} \}/);
  assert.match(authMiddleware, /issuedCompanyEpoch !== currentCompanyEpoch/);
  assert.match(authMiddleware, /INVALID_ACCESS_TOKEN/);
  assert.match(authService, /securityVersion: true/);
  assert.match(authService, /company: user\.company/);
  assert.match(schema, /securityVersion\s+Int\s+@default\(0\)/);
});

test('refresh rotation uses a conditional single-use update and company security version is additive', () => {
  assert.match(authService, /where: \{ id: existing\.id, revokedAt: null, expiresAt: \{ gt: new Date\(\) \} \}/);
  assert.match(authService, /rotated\.count !== 1/);
  assert.match(schema, /model Company \{/);
  assert.match(schema, /securityVersion\s+Int\s+@default\(0\)/);
});

console.log('Security hardening contract checks passed.');
