import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateTrainingAnalytics, REPORT_TRAINING_STATUSES, trainingStatus } from './src/services/reportingAggregation.js';

const asOf = new Date('2026-06-15T12:00:00.000Z');
const employees = [
  { id: 'e1', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: null, departmentId: 'd1' },
  { id: 'e2', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: null, departmentId: 'd1' },
  { id: 'e3', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: null, departmentId: 'd2' },
  { id: 'e4', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: null, departmentId: null },
];
const departments = [
  { id: 'd1', name: 'Learning & Development', companyId: 'company-a' },
  { id: 'd2', name: 'Operations', companyId: 'company-a' },
  { id: 'd3', name: 'No assignments', companyId: 'company-a' },
];
const enrollments = [
  { id: 'a1', userId: 'e1', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'COMPLETED', dueDate: new Date('2026-06-01T00:00:00.000Z') },
  { id: 'a2', userId: 'e1', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'IN_PROGRESS', dueDate: new Date('2026-06-20T00:00:00.000Z') },
  { id: 'a3', userId: 'e2', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'ASSIGNED', dueDate: new Date('2026-06-14T00:00:00.000Z') },
  { id: 'a4', userId: 'e3', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'ASSIGNED', dueDate: asOf },
  { id: 'a5', userId: 'e4', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'COMPLETED', dueDate: null },
];

test('status classification uses exclusive categories and strict due-date boundary', () => {
  assert.equal(trainingStatus({ status: 'COMPLETED', dueDate: new Date('2020-01-01') }, asOf), 'COMPLETED');
  assert.equal(trainingStatus({ status: 'IN_PROGRESS', dueDate: new Date('2026-06-14T23:59:59.999Z') }, asOf), 'OVERDUE');
  assert.equal(trainingStatus({ status: 'ASSIGNED', dueDate: asOf }, asOf), 'NOT_STARTED');
  assert.equal(trainingStatus({ status: 'IN_PROGRESS', dueDate: new Date('2026-06-20T00:00:00.000Z') }, asOf), 'IN_PROGRESS');
});

test('status summary counts every eligible assignment once and keeps documented response keys', () => {
  const analytics = aggregateTrainingAnalytics({ employees, enrollments, departments }, asOf);
  assert.deepEqual(analytics.status, [
    { name: 'COMPLETED', value: 2 },
    { name: 'IN_PROGRESS', value: 1 },
    { name: 'NOT_STARTED', value: 1 },
    { name: 'OVERDUE', value: 1 },
  ]);
  assert.equal(analytics.totalAssignments, 5);
  assert.deepEqual(analytics.statusCounts, { COMPLETED: 2, IN_PROGRESS: 1, NOT_STARTED: 1, OVERDUE: 1 });
  assert.equal(analytics.status.reduce((total, item) => total + item.value, 0), analytics.totalAssignments);
  assert.deepEqual(REPORT_TRAINING_STATUSES, ['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'OVERDUE']);
});

test('department counts include assigned work, completion rate uses all eligible assignments', () => {
  const analytics = aggregateTrainingAnalytics({ employees, enrollments, departments }, asOf);
  assert.deepEqual(analytics.departments, [
    { departmentId: 'd1', department: 'Learning & Development', employees: 2, assignedTrainings: 3, completedTrainings: 1, completionRate: 33.3 },
    { departmentId: 'd2', department: 'Operations', employees: 1, assignedTrainings: 1, completedTrainings: 0, completionRate: 0 },
    { departmentId: 'd3', department: 'No assignments', employees: 0, assignedTrainings: 0, completedTrainings: 0, completionRate: null },
  ]);
});

test('aggregate results do not include employee-level or private fields', () => {
  const analytics = aggregateTrainingAnalytics({
    employees: [...employees, { id: 'private', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: null, departmentId: 'd1', name: 'Private Name', email: 'private@example.test', password: 'secret' }],
    enrollments: [...enrollments, { id: 'a6', userId: 'private', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'COMPLETED', dueDate: null }],
    departments,
  }, asOf);
  const serialized = JSON.stringify(analytics);
  assert.equal(serialized.includes('private@example.test'), false);
  assert.equal(serialized.includes('Private Name'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(Object.hasOwn(analytics, 'employees'), false);
  assert.equal(analytics.totalAssignments, 6);
});

test('employees without a department count in company assignments but not department totals', () => {
  const analytics = aggregateTrainingAnalytics({ employees, enrollments, departments }, asOf);
  const departmentAssignmentTotal = analytics.departments.reduce((total, item) => total + item.assignedTrainings, 0);
  const departmentEmployeeTotal = analytics.departments.reduce((total, item) => total + item.employees, 0);
  assert.equal(analytics.totalAssignments - departmentAssignmentTotal, 1);
  assert.equal(employees.length - departmentEmployeeTotal, 1);
});

test('cancelled, deleted, foreign-tenant, and non-employee enrollments are excluded', () => {
  const invalidEnrollments = [
    ...enrollments,
    { id: 'cancelled', userId: 'e1', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'CANCELLED' },
    { id: 'wrong-tenant-enrollment', userId: 'e1', companyId: 'company-b', courseCompanyId: 'company-b', courseDeletedAt: null, status: 'ASSIGNED' },
    { id: 'deleted-course', userId: 'e1', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: new Date(), status: 'ASSIGNED' },
    { id: 'deleted-employee', userId: 'deleted', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'ASSIGNED' },
    { id: 'other-role', userId: 'admin', companyId: 'company-a', courseCompanyId: 'company-a', courseDeletedAt: null, status: 'ASSIGNED' },
  ];
  const analytics = aggregateTrainingAnalytics({
    employees: [...employees,
      { id: 'deleted', companyId: 'company-a', role: 'EMPLOYEE', deletedAt: new Date(), departmentId: 'd1' },
      { id: 'admin', companyId: 'company-a', role: 'COMPANY_ADMIN', deletedAt: null, departmentId: 'd1' },
      { id: 'foreign-employee', companyId: 'company-b', role: 'EMPLOYEE', deletedAt: null, departmentId: 'foreign-department' },
    ],
    enrollments: [...invalidEnrollments, { id: 'foreign-dept', userId: 'foreign-employee', companyId: 'company-b', courseCompanyId: 'company-b', courseDeletedAt: null, status: 'ASSIGNED' }],
    departments: [...departments, { id: 'foreign-department', name: 'Foreign department', companyId: 'company-a' }],
  }, asOf);
  assert.equal(analytics.totalAssignments, 6);
  assert.equal(analytics.status.reduce((sum, item) => sum + item.value, 0), analytics.totalAssignments);
});

test('empty input returns zero status counts and null department rate for empty departments', () => {
  const analytics = aggregateTrainingAnalytics({ employees: [], enrollments: [], departments: [{ id: 'd0', name: 'Empty' }] }, asOf);
  assert.equal(analytics.totalAssignments, 0);
  assert.deepEqual(analytics.status.map(({ value }) => value), [0, 0, 0, 0]);
  assert.equal(analytics.departments[0].completionRate, null);
});
