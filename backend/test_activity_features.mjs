import assert from 'node:assert/strict';
import prisma from './src/config/db.js';
import * as announcementService from './src/services/announcement.service.js';
import * as notificationService from './src/services/notification.service.js';
import * as activityLogService from './src/services/activityLog.service.js';

let passed = 0;
let total = 0;
function check(condition, message) {
  total += 1;
  assert.equal(condition, true, message);
  passed += 1;
  console.log(`PASS: ${message}`);
}

async function main() {
  const companyA = await prisma.company.findUnique({ where: { slug: 'pt-nusantara-teknologi' } });
  const companyB = await prisma.company.findUnique({ where: { slug: 'pt-sejahtera-manufaktur' } });
  assert(companyA && companyB, 'seed companies are available');
  const adminRole = await prisma.role.findUnique({ where: { name: 'COMPANY_ADMIN' } });
  const employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
  const adminA = await prisma.user.findFirst({ where: { companyId: companyA.id, roleId: adminRole.id } });
  const adminB = await prisma.user.findFirst({ where: { companyId: companyB.id, roleId: adminRole.id } });
  const employees = await prisma.user.findMany({ where: { companyId: companyA.id, roleId: employeeRole.id }, orderBy: { email: 'asc' }, take: 10 });
  const employeeA = employees[0];
  const employeeOtherDepartment = employees.find((user) => user.departmentId !== employeeA.departmentId);
  assert(adminA && adminB && employeeA && employeeOtherDepartment, 'seed users span both companies and departments');

  const hr = { id: adminA.id, role: 'COMPANY_ADMIN', companyId: companyA.id };
  const hrB = { id: adminB.id, role: 'COMPANY_ADMIN', companyId: companyB.id };
  const employee = { id: employeeA.id, role: 'EMPLOYEE', companyId: companyA.id, departmentId: employeeA.departmentId };
  const otherEmployee = { id: employeeOtherDepartment.id, role: 'EMPLOYEE', companyId: companyA.id, departmentId: employeeOtherDepartment.departmentId };
  const marker = `Activity feature test ${Date.now()}`;
  const createdIds = [];

  try {
    const companyAnnouncement = await announcementService.create(hr, { title: `${marker} company`, content: 'Company-wide test message', audience: 'COMPANY' });
    createdIds.push(companyAnnouncement.id);
    check(companyAnnouncement.departmentId === null, 'company-wide announcement is created without a department');
    check((await announcementService.list(hr, { status: 'DRAFT' })).data.some((row) => row.id === companyAnnouncement.id), 'HR can list draft announcements');
    check((await announcementService.getById(hr, companyAnnouncement.id)).id === companyAnnouncement.id, 'HR can retrieve an announcement');

    const updated = await announcementService.update(hr, companyAnnouncement.id, { title: `${marker} updated` });
    check(updated.title === `${marker} updated`, 'HR can update allowed announcement fields');
    const companyPublished = await announcementService.changeStatus(hr, companyAnnouncement.id, 'PUBLISHED');
    check(companyPublished.status === 'PUBLISHED' && Boolean(companyPublished.publishedAt), 'HR can publish an announcement');
    const employeeAnnouncements = await announcementService.list(employee);
    check(employeeAnnouncements.data.some((row) => row.id === companyAnnouncement.id), 'employee sees published company-wide announcement');
    check((await announcementService.list(otherEmployee)).data.some((row) => row.id === companyAnnouncement.id), 'company-wide announcement reaches another department');

    const departmentAnnouncement = await announcementService.create(hr, { title: `${marker} department`, content: 'Department-only test message', audience: 'DEPARTMENT', departmentId: employeeA.departmentId });
    createdIds.push(departmentAnnouncement.id);
    await announcementService.changeStatus(hr, departmentAnnouncement.id, 'PUBLISHED');
    check((await announcementService.list(employee)).data.some((row) => row.id === departmentAnnouncement.id), 'employee sees targeted department announcement');
    check(!(await announcementService.list(otherEmployee)).data.some((row) => row.id === departmentAnnouncement.id), 'other department cannot see targeted announcement');

    const notifications = await notificationService.listNotifications(employee, { limit: 100 });
    check(notifications.data.some((row) => row.title === `${marker} updated`), 'publishing creates an employee notification');
    const targetNotification = notifications.data.find((row) => row.title === `${marker} updated`);
    check(targetNotification && !targetNotification.isRead, 'new announcement notification starts unread');
    await notificationService.markRead(employee, targetNotification.id);
    check((await notificationService.listNotifications(employee, { unread: 'true' })).data.every((row) => row.id !== targetNotification.id), 'employee can mark one notification read');
    await notificationService.markAllRead(employee);
    check((await notificationService.listNotifications(employee, { unread: 'true' })).data.length === 0, 'employee can mark all notifications read');
    check((await notificationService.listNotifications(otherEmployee, { limit: 100 })).data.every((row) => row.userId === otherEmployee.id), 'notifications are scoped to the current employee');

    let blocked = false;
    try { await announcementService.getById(hrB, companyAnnouncement.id); } catch (error) { blocked = error.statusCode === 404; }
    check(blocked, 'company B HR cannot retrieve company A announcement');
    let archiveBlocked = false;
    try { await announcementService.changeStatus(hrB, companyAnnouncement.id, 'ARCHIVED'); } catch (error) { archiveBlocked = error.statusCode === 404; }
    check(archiveBlocked, 'company B HR cannot archive company A announcement');
    check((await announcementService.changeStatus(hr, companyAnnouncement.id, 'ARCHIVED')).status === 'ARCHIVED', 'HR can archive an announcement');

    const logs = await activityLogService.list(hr, { action: 'ANNOUNCEMENT_CREATED', limit: 100 });
    const publishedLogs = await activityLogService.list(hr, { action: 'ANNOUNCEMENT_PUBLISHED', limit: 100 });
    const archivedLogs = await activityLogService.list(hr, { action: 'ANNOUNCEMENT_ARCHIVED', limit: 100 });
    check(logs.data.some((row) => row.entityId === companyAnnouncement.id), 'announcement creation is present in the audit log');
    check(publishedLogs.data.some((row) => row.entityId === companyAnnouncement.id), 'announcement publication is present in the audit log');
    check(archivedLogs.data.some((row) => row.entityId === companyAnnouncement.id), 'announcement archival is present in the audit log');
    check([...logs.data, ...publishedLogs.data, ...archivedLogs.data].every((row) => !JSON.stringify(row.metadata || {}).match(/password|token|secret|hash/i)), 'Audit metadata contains no credential material');
    check((await activityLogService.list(hrB, { action: 'ANNOUNCEMENT_CREATED' })).data.every((row) => row.companyId === companyB.id), 'audit logs are tenant-isolated');
    check((await activityLogService.list(hr, { createdAfter: new Date(Date.now() - 60000), createdBefore: new Date(Date.now() + 60000), limit: 100 })).pagination.total >= logs.pagination.total, 'audit date filters and pagination work');

    console.log(`\nActivity service checks passed: ${passed}/${total}`);
  } finally {
    if (createdIds.length) {
      const notificationWhere = { title: { startsWith: marker } };
      const entityWhere = { entityId: { in: createdIds } };
      const announcementWhere = { id: { in: createdIds } };
      await prisma.notification.deleteMany({ where: notificationWhere });
      await prisma.activityLog.deleteMany({ where: entityWhere });
      await prisma.announcement.deleteMany({ where: announcementWhere });
    }
  }
}

main().catch((error) => { console.error('Activity feature test run failed:', error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
