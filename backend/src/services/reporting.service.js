import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getCompletedLessonCountsBulk, toPercentage } from './progress.service.js';
import { aggregateTrainingAnalytics, trainingStatus } from './reportingAggregation.js';

const FINAL_STATUSES = ['GRADED', 'EXPIRED'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const average = (values) => { const valid = values.filter((value) => value !== null && value !== undefined); return valid.length ? Math.round((valid.reduce((sum, value) => sum + Number(value), 0) / valid.length) * 10) / 10 : 0; };
const certificateStatus = (row, now = new Date()) => row.status === 'REVOKED' ? 'REVOKED' : row.expiresAt && new Date(row.expiresAt) <= now ? 'EXPIRED' : 'ACTIVE';

async function loadSnapshot(companyId) {
  const employeeWhere = { companyId, deletedAt: null, role: { name: 'EMPLOYEE' } };
  const [employees, courses, enrollments, attempts, certificates, competencies, records, departments] = await Promise.all([
    prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        status: true,
        departmentId: true,
        companyId: true,
        deletedAt: true,
        role: { select: { name: true } },
      },
    }),
    prisma.course.findMany({
      where: { companyId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true, title: true, status: true },
    }),
    prisma.enrollment.findMany({
      where: {
        course: { companyId, deletedAt: null },
        user: employeeWhere,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        status: true,
        enrolledAt: true,
        dueDate: true,
        completedAt: true,
        companyId: true,
        course: { select: { deletedAt: true, companyId: true } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { quiz: { course: { companyId } }, user: employeeWhere, status: { in: FINAL_STATUSES } },
      select: { id: true, userId: true, score: true, passed: true, completedAt: true },
    }),
    prisma.certificate.findMany({
      where: { companyId, user: employeeWhere },
      select: { id: true, userId: true, certificateNumber: true, issuedAt: true, expiresAt: true, status: true },
    }),
    prisma.competency.findMany({ where: { companyId }, select: { id: true, name: true, category: true } }),
    prisma.employeeCompetency.findMany({
      where: { user: employeeWhere },
      select: { userId: true, competencyId: true, level: true, score: true },
    }),
    prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
  ]);
  return {
    courses,
    enrollments: enrollments.map((enrollment) => ({ ...enrollment, courseDeletedAt: enrollment.course.deletedAt, courseCompanyId: enrollment.course.companyId })),
    attempts,
    certificates,
    competencies,
    records,
    departments: departments.map((department) => ({ ...department, companyId })),
  };
}

function build(data, asOf) {
  const { totalAssignments, status: statusBreakdown, statusCounts, departments } = aggregateTrainingAnalytics({
    employees: data.employees,
    enrollments: data.enrollments,
    departments: data.departments,
  }, asOf);

  const certificates = data.certificates.map((row) => ({
    ...row,
    reportStatus: certificateStatus(row, asOf),
    remainingDays: row.expiresAt ? Math.ceil((new Date(row.expiresAt) - asOf) / 86400000) : null,
  }));
  const activeCertificates = certificates.filter((row) => row.reportStatus === 'ACTIVE');
  const passed = data.attempts.filter((row) => row.passed === true).length;
  const trainingCompletionRate = totalAssignments
    ? Math.round((data.enrollments.filter((enrollment) => enrollment.status === 'COMPLETED').length / totalAssignments) * 1000) / 10
    : 0;

  return {
    kpis: {
      totalEmployees: data.employees.length,
      activeEmployees: data.employees.filter((row) => row.status === 'ACTIVE').length,
      totalCourses: data.courses.length,
      activeTrainings: statusCounts.IN_PROGRESS + statusCounts.NOT_STARTED,
      trainingCompletionRate,
      averageQuizScore: average(data.attempts.map((row) => row.score)),
      activeCertifications: activeCertificates.length,
      expiringCertifications: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length,
    },
    learning: {
      totalAssigned: totalAssignments,
      ...statusCounts,
      completionRate: trainingCompletionRate,
      status: statusBreakdown,
      coursePopularity: data.courses.map((course) => ({
        courseId: course.id,
        courseTitle: course.title,
        assigned: data.enrollments.filter((enrollment) => enrollment.courseId === course.id).length,
        completed: data.enrollments.filter((enrollment) => enrollment.courseId === course.id && enrollment.status === 'COMPLETED').length,
      })).sort((left, right) => right.assigned - left.assigned).slice(0, 10),
    },
    training: {
      totalAssignments,
      status: statusBreakdown,
      completionRule: 'Enrollment status COMPLETED; overdue applies to non-completed enrollments with a due date before report time.',
    },
    quiz: {
      totalAttempts: data.attempts.length,
      averageScore: average(data.attempts.map((row) => row.score)),
      passRate: data.attempts.length ? Math.round((passed / data.attempts.length) * 1000) / 10 : 0,
      failureRate: data.attempts.length ? Math.round(((data.attempts.length - passed) / data.attempts.length) * 1000) / 10 : 0,
      averageAttemptsPerEmployee: data.employees.length ? Math.round((data.attempts.length / data.employees.length) * 10) / 10 : 0,
      passFail: [{ name: 'Passed', value: passed }, { name: 'Failed', value: data.attempts.length - passed }],
      scoreDistribution: [
        { name: '0–59', value: data.attempts.filter((row) => row.score < 60).length },
        { name: '60–74', value: data.attempts.filter((row) => row.score >= 60 && row.score < 75).length },
        { name: '75–89', value: data.attempts.filter((row) => row.score >= 75 && row.score < 90).length },
        { name: '90–100', value: data.attempts.filter((row) => row.score >= 90).length },
      ],
    },
    certifications: {
      totalIssued: certificates.length,
      active: activeCertificates.length,
      expired: certificates.filter((row) => row.reportStatus === 'EXPIRED').length,
      revoked: certificates.filter((row) => row.reportStatus === 'REVOKED').length,
      expiringWithin30: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 30).length,
      expiringWithin60: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 60).length,
      expiringWithin90: activeCertificates.filter((row) => row.remainingDays >= 0 && row.remainingDays <= 90).length,
      rows: certificates.slice(0, 50),
    },
    competencies: {
      totalCompetencies: data.competencies.length,
      employeesWithRecords: new Set(data.records.map((row) => row.userId)).size,
      averageLevel: average(data.records.map((row) => LEVELS.indexOf(row.level) + 1)),
      levelDistribution: LEVELS.map((name) => ({ name, value: data.records.filter((row) => row.level === name).length })),
      highestAchievement: [],
      lowestAchievement: [],
    },
    departments,
  };
}

export async function getDashboard(user) {
  const asOf = new Date();
  return build(await loadSnapshot(user.companyId), asOf);
}
export async function getSection(user, section) { return (await getDashboard(user))[section]; }
export async function getEmployee(user, employeeId) { const data = await loadSnapshot(user.companyId); const employee = data.employees.find((row) => row.id === employeeId); if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND'); return { employee, trainings: data.enrollments.filter((row) => row.userId === employeeId).map((row) => ({ ...row, reportStatus: trainingStatus(row) })), quizResults: data.attempts.filter((row) => row.userId === employeeId), certifications: data.certificates.filter((row) => row.userId === employeeId), competencies: data.records.filter((row) => row.userId === employeeId) }; }
export async function getTrainings(user, query = {}) {
  const { page, limit, skip, order, sort } = parsePagination(query, {
    sortableFields: ['enrolledAt', 'dueDate', 'completedAt'],
    defaultSort: 'enrolledAt',
  });
  const where = {
    course: { companyId: user.companyId, deletedAt: null },
    user: { companyId: user.companyId, deletedAt: null, role: { name: 'EMPLOYEE' } },
  };
  if (query.courseId) where.course.id = query.courseId;
  if (query.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: query.departmentId, companyId: user.companyId },
      select: { id: true },
    });
    if (!department) throw new AppError('Department not found', 404, 'NOT_FOUND');
    where.user.departmentId = department.id;
  }
  if (['COMPLETED', 'IN_PROGRESS', 'ASSIGNED', 'CANCELLED'].includes(query.status)) where.status = query.status;
  if (query.status === 'OVERDUE') {
    where.status = { not: 'COMPLETED' };
    where.dueDate = { lt: new Date() };
  }
  const [total, rows] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      select: { id: true, userId: true, courseId: true, enrolledAt: true, dueDate: true, completedAt: true, status: true },
    }),
  ]);
  const progressByEnrollment = new Map();
  for (const courseId of [...new Set(rows.map((row) => row.courseId))]) {
    const courseRows = rows.filter((row) => row.courseId === courseId);
    const userIds = courseRows.map((row) => row.userId);
    // eslint-disable-next-line no-await-in-loop
    const completedCounts = await getCompletedLessonCountsBulk(courseId, userIds);
    // eslint-disable-next-line no-await-in-loop
    const totalLessons = await prisma.lesson.count({
      where: { module: { courseId } },
    });
    courseRows.forEach((row) => progressByEnrollment.set(row.id, toPercentage(completedCounts.get(row.userId) ?? 0, totalLessons)));
  }
  const data = rows.map((row) => ({ ...row, reportStatus: trainingStatus(row), progress: progressByEnrollment.get(row.id) ?? 0 }));
  return { data, pagination: buildPaginationMeta({ page, limit, total }) };
}

export async function getExportRows(user, type) {
  const data = await loadSnapshot(user.companyId);
  if (type === 'training') return data.enrollments.map((row) => ({ employeeId: row.userId, courseId: row.courseId, assignedDate: row.enrolledAt, dueDate: row.dueDate, completionDate: row.completedAt, status: trainingStatus(row) }));
  if (type === 'quiz') return data.attempts.map((row) => ({ employeeId: row.userId, score: row.score, passed: row.passed, completedAt: row.completedAt }));
  if (type === 'certifications') return data.certificates.map((row) => ({ employeeId: row.userId, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, expiresAt: row.expiresAt, status: certificateStatus(row) }));
  if (type === 'competencies') return data.records.map((row) => ({ competencyId: row.competencyId, employeeId: row.userId, level: row.level, score: row.score }));
  throw new AppError('Unsupported report export', 400, 'VALIDATION_ERROR');
}
export default { getDashboard, getSection, getEmployee, getTrainings, getExportRows };