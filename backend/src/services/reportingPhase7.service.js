/*
import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

const FINAL_ATTEMPT_STATUSES = ['GRADED', 'EXPIRED'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const average = (values) => {
  const valid = values.filter((value) => value !== null && value !== undefined);
  return valid.length ? Math.round((valid.reduce((sum, value) => sum + Number(value), 0) / valid.length) * 10) / 10 : 0;
};

function trainingStatus(row, now = new Date()) {
  if (row.status === 'COMPLETED') return 'COMPLETED';
  if (row.dueDate && new Date(row.dueDate) < now) return 'OVERDUE';
  return row.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
}

function certificateStatus(row, now = new Date()) {
  if (row.status === 'REVOKED') return 'REVOKED';
  return row.expiresAt && new Date(row.expiresAt) <= now ? 'EXPIRED' : 'ACTIVE';
}

async function loadSnapshot(companyId) {
  const employeeWhere = { companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
  const [employees, courses, enrollments, attempts, certificates, competencies, employeeCompetencies, departments] = await Promise.all([
    prisma.user.findMany({ where: employeeWhere, select: { id: true, name: true, email: true, employeeNumber: true, status: true, departmentId: true } }),
    prisma.course.findMany({ where: { companyId, deletedAt: null }, select: { id: true, title: true, status: true } }),
    prisma.enrollment.findMany({ where: { course: { companyId }, user: employeeWhere }, select: { id: true, userId: true, courseId: true, status: true, enrolledAt: true, dueDate: true, completedAt: true } }),
    prisma.quizAttempt.findMany({ where: { quiz: { course: { companyId } }, user: employeeWhere, status: { in: FINAL_ATTEMPT_STATUSES } }, select: { id: true, userId: true, score: true, passed: true, completedAt: true } }),
    prisma.certificate.findMany({ where: { companyId, user: employeeWhere }, select: { id: true, userId: true, certificateNumber: true, issuedAt: true, expiresAt: true, status: true } }),
    prisma.competency.findMany({ where: { companyId }, select: { id: true, name: true, category: true } }),
    prisma.employeeCompetency.findMany({ where: { user: employeeWhere }, select: { userId: true, competencyId: true, level: true, score: true } }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  return { employees, courses, enrollments, attempts, certificates, competencies, employeeCompetencies, departments };
}

  function build(data) {
    const now = new Date();
    const states = { COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, OVERDUE: 0 };
    data.enrollments.forEach((row) => { states[trainingStatus(row, now)] += 1; });
    const certificates = data.certificates.map((row) => ({ ...row, reportStatus: certificateStatus(row, now), remainingDays: row.expiresAt ? Math.ceil((new Date(row.expiresAt) - now) / 86400000) : null }));
    const activeCertificates = certificates.filter((row) => row.reportStatus === 'ACTIVE');
    const passed = data.attempts.filter((row) => row.passed === true).length;
    const records = data.employeeCompetencies;
    const totalAssigned = data.enrollments.length;
    const departments = data.departments.map((department) => {
      const ids = new Set(data.employees.filter((employee) => employee.departmentId === department.id).map((employee) => employee.id));
      const trainings = data.enrollments.filter((row) => ids.has(row.userId));
      const completed = trainings.filter((row) => row.status === 'COMPLETED').length;
      return { departmentId: department.id, department: department.name, employees: ids.size, assignedTrainings: trainings.length, completedTrainings: completed, completionRate: trainings.length ? Math.round((completed / trainings.length) * 1000) / 10 : 0, averageQuizScore: average(data.attempts.filter((row) => ids.has(row.userId)).map((row) => row.score)), activeCertifications: activeCertificates.filter((row) => ids.has(row.userId)).length, averageCompetencyLevel: average(records.filter((row) => ids.has(row.userId)).map((row) => LEVELS.indexOf(row.level) + 1)) };
    });
    const trainingCompletionRate = totalAssigned ? Math.round((states.COMPLETED / totalAssigned) * 1000) / 10 : 0;
    return {
      kpis: { totalEmployees: data.employees.length, activeEmployees: data.employees.filter((row) => row.status === 'ACTIVE').length, totalCourses: data.courses.length, activeTrainings: states.IN_PROGRESS + states.NOT_STARTED, trainingCompletionRate, averageQuizScore: average(data.attempts.map((row) => row.score)), activeCertifications: activeCertificates.length, expiringCertifications: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length },
      learning: { totalAssigned, ...states, completionRate: trainingCompletionRate, status: Object.entries(states).map(([name, value]) => ({ name, value })), coursePopularity: data.courses.map((course) => ({ courseId: course.id, courseTitle: course.title, assigned: data.enrollments.filter((row) => row.courseId === course.id).length, completed: data.enrollments.filter((row) => row.courseId === course.id && row.status === 'COMPLETED').length })).sort((a, b) => b.assigned - a.assigned).slice(0, 10) },
      quiz: { totalAttempts: data.attempts.length, averageScore: average(data.attempts.map((row) => row.score)), passRate: data.attempts.length ? Math.round((passed / data.attempts.length) * 1000) / 10 : 0, failureRate: data.attempts.length ? Math.round(((data.attempts.length - passed) / data.attempts.length) * 1000) / 10 : 0, averageAttemptsPerEmployee: data.employees.length ? Math.round((data.attempts.length / data.employees.length) * 10) / 10 : 0, passFail: [{ name: 'Passed', value: passed }, { name: 'Failed', value: data.attempts.length - passed }], scoreDistribution: [{ name: '0–59', value: data.attempts.filter((row) => row.score < 60).length }, { name: '60–74', value: data.attempts.filter((row) => row.score >= 60 && row.score < 75).length }, { name: '75–89', value: data.attempts.filter((row) => row.score >= 75 && row.score < 90).length }, { name: '90–100', value: data.attempts.filter((row) => row.score >= 90).length }] },
      certifications: { totalIssued: certificates.length, active: activeCertificates.length, expired: certificates.filter((row) => row.reportStatus === 'EXPIRED').length, revoked: certificates.filter((row) => row.reportStatus === 'REVOKED').length, expiringWithin30: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length, expiringWithin60: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 60).length, expiringWithin90: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 90).length, rows: certificates.slice(0, 50) },
      competencies: { totalCompetencies: data.competencies.length, employeesWithRecords: new Set(records.map((row) => row.userId)).size, averageLevel: average(records.map((row) => LEVELS.indexOf(row.level) + 1)), levelDistribution: LEVELS.map((name) => ({ name, value: records.filter((row) => row.level === name).length })), highestAchievement: [], lowestAchievement: [] },
      departments,
    };
  }

  export async function getDashboard(user) { return build(await loadSnapshot(user.companyId)); }
  export async function getSection(user, section) { return (await getDashboard(user))[section]; }
  export async function getTrainings(user, query = {}) {
    const { page, limit, skip, order, sort } = parsePagination(query, { sortableFields: ['enrolledAt', 'dueDate', 'completedAt'], defaultSort: 'enrolledAt' });
    const where = { course: { companyId: user.companyId }, user: { companyId: user.companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
        if(query.departmentId) where.user.departmentId = query.departmentId;
        if(query.courseId) where.courseId = query.courseId;
        if(query.search) where.user.name = { contains: query.search, mode: 'insensitive' };
        const [total, rows] = await Promise.all([prisma.enrollment.count({ where }), prisma.enrollment.findMany({ where, skip, take: limit, orderBy: { [sort]: order }, select: { id: true, userId: true, courseId: true, enrolledAt: true, dueDate: true, completedAt: true, status: true } })]);
        const data = rows.map((row) => ({ ...row, reportStatus: trainingStatus(row), progress: row.status === 'COMPLETED' ? 100 : 0 })).filter((row) => !query.status || row.reportStatus === query.status);
        return { data, pagination: buildPaginationMeta({ page, limit, total }) };
      }
export async function getExportRows(user, type) {
        const data = await loadSnapshot(user.companyId);
    if (type === 'training') return data.enrollments.map((row) => ({ employeeId: row.userId, courseId: row.courseId, assignedDate: row.enrolledAt, dueDate: row.dueDate, completionDate: row.completedAt, status: trainingStatus(row) }));
    if (type === 'quiz') return data.attempts.map((row) => ({ employeeId: row.userId, score: row.score, passed: row.passed, completedAt: row.completedAt }));
    if (type === 'certifications') return data.certificates.map((row) => ({ employeeId: row.userId, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, expiresAt: row.expiresAt, status: certificateStatus(row) }));
    if (type === 'competencies') return data.employeeCompetencies.map((row) => ({ competencyId: row.competencyId, employeeId: row.userId, level: row.level, score: row.score }));
    throw new AppError('Unsupported report export', 400, 'VALIDATION_ERROR');
  }

export default { getDashboard, getSection, getTrainings, getExportRows };
*/

import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getCompletedLessonCountsBulk, toPercentage } from './progress.service.js';

const FINAL_STATUSES = ['GRADED', 'EXPIRED'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const average = (values) => { const valid = values.filter((value) => value !== null && value !== undefined); return valid.length ? Math.round((valid.reduce((sum, value) => sum + Number(value), 0) / valid.length) * 10) / 10 : 0; };
const trainingStatus = (row, now = new Date()) => row.status === 'COMPLETED' ? 'COMPLETED' : row.dueDate && new Date(row.dueDate) < now ? 'OVERDUE' : row.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
const certificateStatus = (row, now = new Date()) => row.status === 'REVOKED' ? 'REVOKED' : row.expiresAt && new Date(row.expiresAt) <= now ? 'EXPIRED' : 'ACTIVE';

async function loadSnapshot(companyId) {
  const employeeWhere = { companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
  const [employees, courses, enrollments, attempts, certificates, competencies, records, departments] = await Promise.all([
    prisma.user.findMany({ where: employeeWhere, select: { id: true, name: true, email: true, employeeNumber: true, status: true, departmentId: true } }),
    prisma.course.findMany({ where: { companyId, deletedAt: null }, select: { id: true, title: true, status: true } }),
    prisma.enrollment.findMany({ where: { course: { companyId }, user: employeeWhere }, select: { id: true, userId: true, courseId: true, status: true, enrolledAt: true, dueDate: true, completedAt: true } }),
    prisma.quizAttempt.findMany({ where: { quiz: { course: { companyId } }, user: employeeWhere, status: { in: FINAL_STATUSES } }, select: { id: true, userId: true, score: true, passed: true, completedAt: true } }),
    prisma.certificate.findMany({ where: { companyId, user: employeeWhere }, select: { id: true, userId: true, certificateNumber: true, issuedAt: true, expiresAt: true, status: true } }),
    prisma.competency.findMany({ where: { companyId }, select: { id: true, name: true, category: true } }),
    prisma.employeeCompetency.findMany({ where: { user: employeeWhere }, select: { userId: true, competencyId: true, level: true, score: true } }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  return { employees, courses, enrollments, attempts, certificates, competencies, records, departments };
}

function build(data) {
  const now = new Date();
  const states = { COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, OVERDUE: 0 };
  data.enrollments.forEach((row) => { states[trainingStatus(row, now)] += 1; });
  const certificates = data.certificates.map((row) => ({ ...row, reportStatus: certificateStatus(row, now), remainingDays: row.expiresAt ? Math.ceil((new Date(row.expiresAt) - now) / 86400000) : null }));
  const activeCertificates = certificates.filter((row) => row.reportStatus === 'ACTIVE');
  const passed = data.attempts.filter((row) => row.passed === true).length;
  const completionRate = data.enrollments.length ? Math.round((states.COMPLETED / data.enrollments.length) * 1000) / 10 : 0;
  const departments = data.departments.map((department) => { const ids = new Set(data.employees.filter((employee) => employee.departmentId === department.id).map((employee) => employee.id)); const trainings = data.enrollments.filter((row) => ids.has(row.userId)); const completed = trainings.filter((row) => row.status === 'COMPLETED').length; return { departmentId: department.id, department: department.name, employees: ids.size, assignedTrainings: trainings.length, completedTrainings: completed, completionRate: trainings.length ? Math.round((completed / trainings.length) * 1000) / 10 : 0, averageQuizScore: average(data.attempts.filter((row) => ids.has(row.userId)).map((row) => row.score)), activeCertifications: activeCertificates.filter((row) => ids.has(row.userId)).length, averageCompetencyLevel: average(data.records.filter((row) => ids.has(row.userId)).map((row) => LEVELS.indexOf(row.level) + 1)) }; });
  return { kpis: { totalEmployees: data.employees.length, activeEmployees: data.employees.filter((row) => row.status === 'ACTIVE').length, totalCourses: data.courses.length, activeTrainings: states.IN_PROGRESS + states.NOT_STARTED, trainingCompletionRate: completionRate, averageQuizScore: average(data.attempts.map((row) => row.score)), activeCertifications: activeCertificates.length, expiringCertifications: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length }, learning: { totalAssigned: data.enrollments.length, ...states, completionRate, status: Object.entries(states).map(([name, value]) => ({ name, value })), coursePopularity: data.courses.map((course) => ({ courseId: course.id, courseTitle: course.title, assigned: data.enrollments.filter((row) => row.courseId === course.id).length, completed: data.enrollments.filter((row) => row.courseId === course.id && row.status === 'COMPLETED').length })).sort((a, b) => b.assigned - a.assigned).slice(0, 10) }, quiz: { totalAttempts: data.attempts.length, averageScore: average(data.attempts.map((row) => row.score)), passRate: data.attempts.length ? Math.round((passed / data.attempts.length) * 1000) / 10 : 0, failureRate: data.attempts.length ? Math.round(((data.attempts.length - passed) / data.attempts.length) * 1000) / 10 : 0, averageAttemptsPerEmployee: data.employees.length ? Math.round((data.attempts.length / data.employees.length) * 10) / 10 : 0, passFail: [{ name: 'Passed', value: passed }, { name: 'Failed', value: data.attempts.length - passed }], scoreDistribution: [{ name: '0–59', value: data.attempts.filter((row) => row.score < 60).length }, { name: '60–74', value: data.attempts.filter((row) => row.score >= 60 && row.score < 75).length }, { name: '75–89', value: data.attempts.filter((row) => row.score >= 75 && row.score < 90).length }, { name: '90–100', value: data.attempts.filter((row) => row.score >= 90).length }] }, certifications: { totalIssued: certificates.length, active: activeCertificates.length, expired: certificates.filter((row) => row.reportStatus === 'EXPIRED').length, revoked: certificates.filter((row) => row.reportStatus === 'REVOKED').length, expiringWithin30: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length, expiringWithin60: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 60).length, expiringWithin90: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 90).length, rows: certificates.slice(0, 50) }, competencies: { totalCompetencies: data.competencies.length, employeesWithRecords: new Set(data.records.map((row) => row.userId)).size, averageLevel: average(data.records.map((row) => LEVELS.indexOf(row.level) + 1)), levelDistribution: LEVELS.map((name) => ({ name, value: data.records.filter((row) => row.level === name).length })), highestAchievement: data.competencies.map((item) => ({ ...item, averageScore: average(data.records.filter((row) => row.competencyId === item.id).map((row) => row.score)) })).sort((a, b) => b.averageScore - a.averageScore).slice(0, 5), lowestAchievement: data.competencies.map((item) => ({ ...item, averageScore: average(data.records.filter((row) => row.competencyId === item.id).map((row) => row.score)) })).sort((a, b) => a.averageScore - b.averageScore).slice(0, 5) }, departments }; }

export async function getDashboard(user) { return build(await loadSnapshot(user.companyId)); }
export async function getSection(user, section) { return (await getDashboard(user))[section]; }
export async function getEmployee(user, employeeId) { const data = await loadSnapshot(user.companyId); const employee = data.employees.find((row) => row.id === employeeId); if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND'); return { employee, trainings: data.enrollments.filter((row) => row.userId === employeeId).map((row) => ({ ...row, reportStatus: trainingStatus(row) })), quizResults: data.attempts.filter((row) => row.userId === employeeId), certifications: data.certificates.filter((row) => row.userId === employeeId), competencies: data.records.filter((row) => row.userId === employeeId) }; }
export async function getTrainings(user, query = {}) {
  const { page, limit, skip, order, sort } = parsePagination(query, { sortableFields: ['enrolledAt', 'dueDate', 'completedAt'], defaultSort: 'enrolledAt' });
  const where = { course: { companyId: user.companyId } };
  if (query.courseId) where.course = { companyId: user.companyId, id: query.courseId };
  if (query.departmentId) where.user = { departmentId: query.departmentId, companyId: user.companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
  if (query.status === 'COMPLETED' || query.status === 'IN_PROGRESS' || query.status === 'ASSIGNED' || query.status === 'CANCELLED') where.status = query.status;
  if (query.status === 'OVERDUE') where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
  const [total, rows] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({ where, skip, take: limit, orderBy: { [sort]: order }, select: { id: true, userId: true, courseId: true, enrolledAt: true, dueDate: true, completedAt: true, status: true } }),
  ]);
  const progressByEnrollment = new Map();
  for (const courseId of [...new Set(rows.map((row) => row.courseId))]) {
    const courseRows = rows.filter((row) => row.courseId === courseId);
    const userIds = courseRows.map((row) => row.userId);
    // eslint-disable-next-line no-await-in-loop
    const completedCounts = await getCompletedLessonCountsBulk(courseId, userIds);
    const totalLessons = await prisma.lesson.count({
      where: { module: { courseId } },
    });
    courseRows.forEach((row) => progressByEnrollment.set(row.id, toPercentage(completedCounts.get(row.userId) ?? 0, totalLessons)));
  }
  const data = rows.map((row) => ({ ...row, reportStatus: trainingStatus(row), progress: progressByEnrollment.get(row.id) ?? 0 })).filter((row) => !query.status || row.reportStatus === query.status);
  return { data, pagination: buildPaginationMeta({ page, limit, total }) };
}
export async function getExportRows(user, type) { const data = await loadSnapshot(user.companyId); if (type === 'training') return data.enrollments.map((row) => ({ employeeId: row.userId, courseId: row.courseId, assignedDate: row.enrolledAt, dueDate: row.dueDate, completionDate: row.completedAt, status: trainingStatus(row) })); if (type === 'quiz') return data.attempts.map((row) => ({ employeeId: row.userId, score: row.score, passed: row.passed, completedAt: row.completedAt })); if (type === 'certifications') return data.certificates.map((row) => ({ employeeId: row.userId, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, expiresAt: row.expiresAt, status: certificateStatus(row) })); if (type === 'competencies') return data.records.map((row) => ({ competencyId: row.competencyId, employeeId: row.userId, level: row.level, score: row.score })); throw new AppError('Unsupported report export', 400, 'VALIDATION_ERROR'); }
export default { getDashboard, getSection, getEmployee, getTrainings, getExportRows };
