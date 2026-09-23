import * as dashboardService from './dashboard.service.js';

export async function getDashboard(user) {
  const base = await dashboardService.getHrDashboardStats(user);
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
export async function getSection(user, section) { const dashboard = await getDashboard(user); return dashboard[section]; }
export default { getDashboard, getSection };
