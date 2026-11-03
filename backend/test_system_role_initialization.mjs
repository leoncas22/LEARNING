import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const initializer = await readFile(new URL('./prisma/init-system-roles.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const expectedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE'];

for (const role of expectedRoles) {
  assert.match(initializer, new RegExp(`name: '${role}'`), `${role} is initialized`);
}
assert.match(initializer, /prisma\.role\.upsert\(/, 'role initialization uses idempotent upsert');
assert.equal(packageJson.scripts['db:init-roles'], 'node prisma/init-system-roles.js', 'npm exposes the role-only initialization command');
assert.doesNotMatch(initializer, /company\.create|user\.create|course\.create|lesson\.create|quiz\.create|enrollment\.create/i, 'role initialization does not create demo business data');
console.log('System-role initializer structure checks passed: 7/7');
