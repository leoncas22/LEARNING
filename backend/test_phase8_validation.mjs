 import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  announcementIdSchema,
  createAnnouncementSchema,
  listAnnouncementsSchema,
  listAuditLogsSchema,
  listNotificationsSchema,
  notificationIdSchema,
  updateAnnouncementSchema,
} from './src/validators/phase8.validation.js';

let passed = 0;
let total = 0;
function check(condition, message) {
  total += 1;
  assert.equal(condition, true, message);
  passed += 1;
  console.log(`PASS: ${message}`);
}
function validUuid() { return '123e4567-e89b-12d3-a456-426614174000'; }
function rejects(schema, input, message) {
  check(schema.safeParse(input).success === false, message);
}

const validBody = { title: 'Maintenance', content: 'The platform will be unavailable tonight.', audience: 'COMPANY' };
check(createAnnouncementSchema.safeParse({ body: validBody }).success, 'company-wide announcement is valid');
check(createAnnouncementSchema.safeParse({ body: { ...validBody, audience: 'DEPARTMENT', departmentId: validUuid() } }).success, 'department announcement is valid');
rejects(createAnnouncementSchema, { body: { ...validBody, title: '' } }, 'announcement title is required');
rejects(createAnnouncementSchema, { body: { ...validBody, content: '' } }, 'announcement content is required');
rejects(createAnnouncementSchema, { body: { ...validBody, audience: 'INVALID' } }, 'announcement audience is restricted');
rejects(createAnnouncementSchema, { body: { ...validBody, audience: 'DEPARTMENT' } }, 'department audience requires departmentId');
rejects(createAnnouncementSchema, { body: { ...validBody, departmentId: 'bad' } }, 'departmentId must be a UUID');
rejects(createAnnouncementSchema, { body: { ...validBody, unexpected: true } }, 'unknown announcement fields are rejected');
check(updateAnnouncementSchema.safeParse({ params: { id: validUuid() }, body: { title: 'Updated' } }).success, 'partial announcement update is valid');
rejects(updateAnnouncementSchema, { params: { id: 'bad' }, body: { title: 'Updated' } }, 'announcement route id is validated');
rejects(updateAnnouncementSchema, { params: { id: validUuid() }, body: { unexpected: true } }, 'unknown update fields are rejected');
rejects(updateAnnouncementSchema, { params: { id: validUuid() }, body: { audience: 'DEPARTMENT' } }, 'department update requires departmentId');
rejects(updateAnnouncementSchema, { params: { id: validUuid() }, body: { audience: 'COMPANY', departmentId: validUuid() } }, 'company update cannot target a department');
check(announcementIdSchema.safeParse({ params: { id: validUuid() } }).success, 'announcement status route id is valid');

check(listAnnouncementsSchema.safeParse({ query: { page: '2', limit: '10', status: 'PUBLISHED' } }).success, 'announcement list pagination and status are valid');
rejects(listAnnouncementsSchema, { query: { page: '0' } }, 'announcement page must be positive');
rejects(listAnnouncementsSchema, { query: { status: 'NOPE' } }, 'announcement status filter is restricted');

check(listNotificationsSchema.safeParse({ query: { page: '1', limit: '20', unread: 'true' } }).success, 'notification list filters are valid');
rejects(listNotificationsSchema, { query: { unread: 'yes' } }, 'notification unread filter is restricted');
rejects(notificationIdSchema, { params: { id: 'not-an-id' } }, 'notification id is validated');

check(listAuditLogsSchema.safeParse({ query: { page: '1', limit: '25', action: 'ANNOUNCEMENT_CREATED', createdAfter: '2026-01-01' } }).success, 'audit filters and date are valid');
rejects(listAuditLogsSchema, { query: { createdAfter: 'not-a-date' } }, 'audit date must be valid');
rejects(listAuditLogsSchema, { query: { createdAfter: '2026-02-01', createdBefore: '2026-01-01' } }, 'audit date range must be ordered');
rejects(listAuditLogsSchema, { query: { limit: '101' } }, 'audit limit is bounded');

assert.equal(typeof z.object, 'function');
console.log(`\nPhase 8 validation checks passed: ${passed}/${total}`);
