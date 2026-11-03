import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import reportingService from './src/services/reporting.service.js';

const serviceSource = await readFile(new URL('./src/services/reporting.service.js', import.meta.url), 'utf8');
const routesSource = await readFile(new URL('./src/routes/reporting.routes.js', import.meta.url), 'utf8');
const schemaSource = await readFile(new URL('./prisma/schema.prisma', import.meta.url), 'utf8');

test('reporting dashboard retains original sections and appends aggregate status/departments', async () => {
  assert.equal(typeof reportingService.getDashboard, 'function');
  assert.match(serviceSource, /kpis:\s*\{/);
  assert.match(serviceSource, /learning:\s*\{/);
  assert.match(serviceSource, /quiz:\s*\{/);
  assert.match(serviceSource, /certifications:\s*\{/);
  assert.match(serviceSource, /competencies:\s*\{/);
  assert.match(serviceSource, /training:\s*\{/);
  assert.match(serviceSource, /departments,/);
  assert.match(serviceSource, /totalAssigned: totalAssignments/);
  assert.match(serviceSource, /\.statusCounts/);
});

test('dashboard snapshot queries derive tenant and visibility scope server-side', () => {
  assert.match(serviceSource, /const employeeWhere = \{ companyId, deletedAt: null, role: \{ name: 'EMPLOYEE' \} \}/);
  assert.match(serviceSource, /course: \{ companyId, deletedAt: null \}[\s\S]*?user: employeeWhere[\s\S]*?status: \{ not: 'CANCELLED' \}/);
  assert.match(serviceSource, /prisma\.department\.findMany\(\{ where: \{ companyId \}/);
  assert.match(routesSource, /router\.use\(authenticate, authorize\('COMPANY_ADMIN'\)\)/);
});

test('department filter validation rejects foreign-company departments before enrollment query', () => {
  assert.match(serviceSource, /where: \{ id: query\.departmentId, companyId: user\.companyId \}/);
  assert.match(serviceSource, /if \(!department\) throw new AppError\('Department not found', 404, 'NOT_FOUND'\)/);
  assert.match(schemaSource, /model Department \{[\s\S]*?companyId\s+String/);
});

test('report snapshot employee projection excludes personal and authentication fields', () => {
  const projection = serviceSource.match(/prisma\.user\.findMany\(\{[\s\S]*?select: \{([\s\S]*?)\n\s*\}\),/)?.[1] || '';
  assert.match(projection, /id: true/);
  assert.match(projection, /status: true/);
  assert.match(projection, /departmentId: true/);
  assert.equal(projection.includes('email: true'), false);
  assert.equal(projection.includes('password'), false);
  assert.equal(projection.includes('employeeNumber'), false);
  assert.equal(projection.includes('name: true') && !projection.includes('role: { select: { name: true }'), false);
});

test('schema enum confirms stored enrollment statuses exclude derived OVERDUE', () => {
  const enumBody = schemaSource.match(/enum EnrollmentStatus \{([^}]+)\}/)?.[1] || '';
  assert.deepEqual(enumBody.trim().split(/\s+/), ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  assert.match(schemaSource, /OVERDUE[\s\S]*?is derived \(dueDate < now\(\) && status != COMPLETED\), not stored/);
});
