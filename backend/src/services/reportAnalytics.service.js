import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import * as dashboardService from './dashboard.service.js';

const ATTEMPT_STATUSES = ['GRADED', 'EXPIRED'];
const LEVELS = ['BEGINNER', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const round = (value, decimals = 1) => Math.round(value * (10 ** decimals)) / (10 ** decimals);
const average = (values) => { const valid = values.filter((value) => value !== null && value !== undefined); return valid.length ? round(valid.reduce((sum, value) => sum + Number(value), 0) / valid.length) : 0; };
const certificateStatus = (row, now = new Date()) => row.status === 'REVOKED' ? 'REVOKED' : row.expiresAt && new Date(row.expiresAt) <= now ? 'EXPIRED' : 'ACTIVE';
const trainingStatus = (row, now = new Date()) => row.status === 'COMPLETED' ? 'COMPLETED' : row.dueDate && new Date(row.dueDate) < now ? 'OVERDUE' : row.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';

/*
async function snapshot(companyId) {
  const employeeWhere = { companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
  const [employees, courses, enrollments, attempts, certificates, competencies, departments] = await Promise.all([
    prisma.user.findMany({ where: employeeWhere, select: { id: true, name: true, email: true, employeeNumber: true, status: true, departmentId: true } }),
    prisma.course.findMany({ where: { companyId, deletedAt: null }, select: { id: true, title: true, status: true } }),
    prisma.enrollment.findMany({ where: { course: { companyId }, user: employeeWhere }, select: { id: true, userId: true, courseId: true, status: true, enrolledAt: true, dueDate: true, completedAt: true } }),
    prisma.quizAttempt.findMany({
      where: { quiz: { course: { companyId } }, user: employeeWhere, status: { in: ATTEMPT_STATUSES } },
      select: { id: true, userId: true, score: true, passed: true, completedAt: true },
    }),
    prisma.certificate.findMany({
      where: { companyId, user: employeeWhere },
      select: { id: true, userId: true, certificateNumber: true, issuedAt: true, expiresAt: true, status: true },
    }),
    prisma.competency.findMany({
      where: { companyId },
      select: { id: true, name: true, category: true },
    }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  return { employees, courses, enrollments, attempts, certificates, competencies, departments };
}

function build(snapshotData) {
    const now = new Date();
    const statuses = { COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, OVERDUE: 0 };
    snapshotData.enrollments.forEach((row) => { statuses[trainingStatus(row, now)] += 1; });
    const passed = snapshotData.attempts.filter((row) => row.passed === true).length;
    const certRows = snapshotData.certificates.map((row) => ({ ...row, reportStatus: certificateStatus(row, now), remainingDays: row.expiresAt ? Math.ceil((new Date(row.expiresAt) - now) / 86400000) : null }));
    const activeCerts = certRows.filter((row) => row.reportStatus === 'ACTIVE');
    const records = snapshotData.competencies.flatMap((item) => item.employeeCompetencies);
    const levelDistribution = Object.fromEntries(LEVELS.map((level) => [level, records.filter((row) => row.level === level).length]));
    const coursePopularity = snapshotData.courses.map((course) => ({ courseId: course.id, courseTitle: course.title, assigned: snapshotData.enrollments.filter((row) => row.courseId === course.id).length, completed: snapshotData.enrollments.filter((row) => row.courseId === course.id && row.status === 'COMPLETED').length })).sort((a, b) => b.assigned - a.assigned).slice(0, 10);
    const competencyRows = snapshotData.competencies.map((item) => ({ id: item.id, name: item.name, category: item.category, averageScore: average(item.employeeCompetencies.map((row) => row.score)), employeeCount: item.employeeCompetencies.length }));
    const departments = snapshotData.departments.map((department) => { const ids = new Set(snapshotData.employees.filter((employee) => employee.departmentId === department.id).map((employee) => employee.id)); const trainings = snapshotData.enrollments.filter((row) => ids.has(row.userId)); const departmentAttempts = snapshotData.attempts.filter((row) => ids.has(row.userId)); const departmentRecords = records.filter((row) => ids.has(row.userId)); return { departmentId: department.id, department: department.name, employees: ids.size, assignedTrainings: trainings.length, completedTrainings: trainings.filter((row) => row.status === 'COMPLETED').length, completionRate: trainings.length ? round((trainings.filter((row) => row.status === 'COMPLETED').length / trainings.length) * 100) : 0, averageQuizScore: average(departmentAttempts.map((row) => row.score)), activeCertifications: activeCerts.filter((row) => ids.has(row.userId)).length, averageCompetencyLevel: average(departmentRecords.map((row) => LEVELS.indexOf(row.level) + 1)) }; });
    return { kpis: { totalEmployees: snapshotData.employees.length, activeEmployees: snapshotData.employees.filter((row) => row.status === 'ACTIVE').length, totalCourses: snapshotData.courses.length, activeTrainings: statuses.IN_PROGRESS + statuses.NOT_STARTED, trainingCompletionRate: snapshotData.enrollments.length ? round((statuses.COMPLETED / snapshotData.enrollments.length) * 100) : 0, averageQuizScore: average(snapshotData.attempts.map((row) => row.score)), activeCertifications: activeCerts.length, expiringCertifications: activeCerts.filter((row) => row.remainingDays !== null && row.remainingDays >= 0 && row.remainingDays <= 30).length }, learning: { totalAssigned: snapshotData.enrollments.length, ...statuses, completionRate: snapshotData.enrollments.length ? round((statuses.COMPLETED / snapshotData.enrollments.length) * 100) : 0, status: Object.entries(statuses).map(([name, value]) => ({ name, value })), coursePopularity }, quiz: { totalAttempts: snapshotData.attempts.length, averageScore: average(snapshotData.attempts.map((row) => row.score)), passRate: snapshotData.attempts.length ? round((passed / snapshotData.attempts.length) * 100) : 0, failureRate: snapshotData.attempts.length ? round(((snapshotData.attempts.length - passed) / snapshotData.attempts.length) * 100) : 0, averageAttemptsPerEmployee: snapshotData.employees.length ? round(snapshotData.attempts.length / snapshotData.employees.length) : 0, passFail: [{ name: 'Passed', value: passed }, { name: 'Failed', value: snapshotData.attempts.length - passed }], scoreDistribution: [{ name: '0–59', value: snapshotData.attempts.filter((row) => row.score < 60).length }, { name: '60–74', value: snapshotData.attempts.filter((row) => row.score >= 60 && row.score < 75).length }, { name: '75–89', value: snapshotData.attempts.filter((row) => row.score >= 75 && row.score < 90).length }, { name: '90–100', value: snapshotData.attempts.filter((row) => row.score >= 90).length }] }, certifications: { totalIssued: certRows.length, active: activeCerts.length, expired: certRows.filter((row) => row.reportStatus === 'EXPIRED').length, revoked: certRows.filter((row) => row.reportStatus === 'REVOKED').length, expiringWithin30: activeCerts.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length, expiringWithin60: activeCerts.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 60).length, expiringWithin90: activeCerts.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 90).length, rows: certRows.sort((a, b) => (a.remainingDays ?? 99999) - (b.remainingDays ?? 99999)).slice(0, 50) }, competencies: { totalCompetencies: snapshotData.competencies.length, employeesWithRecords: new Set(records.map((row) => row.userId)).size, averageLevel: average(records.map((row) => LEVELS.indexOf(row.level) + 1)), levelDistribution: Object.entries(levelDistribution).map(([name, value]) => ({ name, value })), highestAchievement: [...competencyRows].sort((a, b) => b.averageScore - a.averageScore).slice(0, 5), lowestAchievement: [...competencyRows].sort((a, b) => a.averageScore - b.averageScore).slice(0, 5) }, departments };
  }

export async function getDashboard(actingUser) { return build(await snapshot(actingUser.companyId)); }
export async function getSection(actingUser, section) { const data = await getDashboard(actingUser); return data[section]; }
  export async function getEmployee(actingUser, employeeId) { const data = await snapshot(actingUser.companyId); const employee = data.employees.find((row) => row.id === employeeId); if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND'); return { employee, trainings: data.enrollments.filter((row) => row.userId === employeeId).map((row) => ({ ...row, reportStatus: trainingStatus(row) })), quizResults: data.attempts.filter((row) => row.userId === employeeId), certifications: data.certificates.filter((row) => row.userId === employeeId).map((row) => ({ ...row, reportStatus: certificateStatus(row) })), competencies: data.competencies.map((row) => ({ ...row, employeeCompetencies: row.employeeCompetencies.filter((item) => item.userId === employeeId) })).filter((row) => row.employeeCompetencies.length), averageQuizScore: average(data.attempts.filter((row) => row.userId === employeeId).map((row) => row.score)) }; }
  export async function getTrainings(actingUser, query = {}) {
    const { page, limit, skip, search, order, sort } = parsePagination(query, { sortableFields: ['enrolledAt', 'dueDate', 'completedAt'], defaultSort: 'enrolledAt' });
    const where = { course: { companyId: actingUser.companyId } };
    if (query.departmentId) where.user = { departmentId: query.departmentId };
    if (query.courseId) where.courseId = query.courseId;
    if (search) where.course = { companyId: actingUser.companyId, title: { contains: search, mode: 'insensitive' } };
    const [total, rows] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({ where, skip, take: limit, orderBy: { [sort]: order }, select: { id: true, userId: true, courseId: true, enrolledAt: true, dueDate: true, completedAt: true, status: true } }),
    ]);
    const data = rows.map((row) => ({ ...row, reportStatus: trainingStatus(row), progress: row.status === 'COMPLETED' ? 100 : 0 })).filter((row) => !query.status || row.reportStatus === query.status);
    return { data, pagination: buildPaginationMeta({ page, limit, total }) };
  }
    export async function getExportRows(actingUser, type) { const data = await snapshot(actingUser.companyId); if (type === 'training') return data.enrollments.map((row) => ({ employee: row.user.name, department: row.user.department?.name || '', course: row.course.title, assignedDate: row.enrolledAt, dueDate: row.dueDate, completionDate: row.completedAt, status: trainingStatus(row) })); if (type === 'quiz') return data.attempts.map((row) => ({ employeeId: row.userId, course: row.quiz.course.title, quiz: row.quiz.title, score: row.score, passed: row.passed, completedAt: row.completedAt })); if (type === 'certifications') return data.certificates.map((row) => ({ employee: row.user.name, certification: row.certification.title, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, expiresAt: row.expiresAt, status: certificateStatus(row) })); if (type === 'competencies') return data.competencies.flatMap((item) => item.employeeCompetencies.map((row) => ({ competency: item.name, employeeId: row.userId, level: row.level, score: row.score, achievedAt: row.achievedAt }))); throw new AppError('Unsupported report export', 400, 'VALIDATION_ERROR'); }
    export default { getDashboard, getSection, getEmployee, getTrainings, getExportRows };
*/

export async function getDashboard(actingUser) {
  const base = await dashboardService.getHrDashboardStats(actingUser);
  return {
    kpis: {
      totalEmployees: base.totalEmployees,
      activeEmployees: base.activeEmployees,
      totalCourses: base.publishedCourses,
      activeTrainings: base.activeTrainings,
      trainingCompletionRate: base.completedTrainings + base.activeTrainings ? Math.round((base.completedTrainings / (base.completedTrainings + base.activeTrainings)) * 1000) / 10 : 0,
      averageQuizScore: 0,
      activeCertifications: 0,
      expiringCertifications: 0,
    },
    learning: { totalAssigned: base.completedTrainings + base.activeTrainings, completed: base.completedTrainings, inProgress: base.activeTrainings, notStarted: 0, overdue: 0, completionRate: base.averageLearningProgress, status: [] },
    quiz: { totalAttempts: 0, averageScore: 0, passRate: 0, failureRate: 0, averageAttemptsPerEmployee: 0, passFail: [], scoreDistribution: [] },
    certifications: { totalIssued: 0, active: 0, expired: 0, revoked: 0, expiringWithin30: 0, expiringWithin60: 0, expiringWithin90: 0, rows: [] },
    competencies: { totalCompetencies: 0, employeesWithRecords: 0, averageLevel: 0, levelDistribution: [], highestAchievement: [], lowestAchievement: [] },
    departments: [],
  };
}

export async function getSection(actingUser, section) {
  const dashboard = await getDashboard(actingUser);
  return dashboard[section];
}

export default { getDashboard, getSection };

