export const REPORT_TRAINING_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'OVERDUE'];

/** Enrollment completion is authoritative; overdue is exclusive and uses a strict dueDate < asOf boundary. */
export function trainingStatus(enrollment, asOf) {
  if (enrollment.status === 'COMPLETED') return 'COMPLETED';
  if (enrollment.dueDate && new Date(enrollment.dueDate) < asOf) return 'OVERDUE';
  return enrollment.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
}

/** Build aggregates from already tenant-filtered reporting records; returns counts only, never user rows. */
export function aggregateTrainingAnalytics({ employees, enrollments, departments }, asOf) {
  const counts = Object.fromEntries(REPORT_TRAINING_STATUSES.map((status) => [status, 0]));
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const eligibleEnrollments = enrollments.filter((enrollment) => {
    const employee = employeesById.get(enrollment.userId);
    return enrollment.status !== 'CANCELLED'
      && employee
      && employee.deletedAt == null
      && employee.role === 'EMPLOYEE'
      && employee.companyId === enrollment.companyId
      && enrollment.courseDeletedAt == null
      && enrollment.courseCompanyId === enrollment.companyId;
  });

  for (const enrollment of eligibleEnrollments) {
    counts[trainingStatus(enrollment, asOf)] += 1;
  }

  const departmentTotals = new Map(departments.map((department) => [department.id, {
    departmentId: department.id,
    department: department.name,
    companyId: department.companyId,
    employees: 0,
    assignedTrainings: 0,
    completedTrainings: 0,
  }]));

  for (const employee of employees) {
    const department = employee.departmentId ? departmentTotals.get(employee.departmentId) : null;
    if (department && employee.companyId === department.companyId) department.employees += 1;
  }

  for (const enrollment of eligibleEnrollments) {
    const employee = employeesById.get(enrollment.userId);
    const department = employee?.departmentId ? departmentTotals.get(employee.departmentId) : null;
    if (!department || employee.companyId !== department.companyId) continue;
    department.assignedTrainings += 1;
    if (enrollment.status === 'COMPLETED') department.completedTrainings += 1;
  }

  const departmentMetrics = [...departmentTotals.values()].map((department) => ({
    departmentId: department.departmentId,
    department: department.department,
    employees: department.employees,
    assignedTrainings: department.assignedTrainings,
    completedTrainings: department.completedTrainings,
    completionRate: department.assignedTrainings
      ? Math.round((department.completedTrainings / department.assignedTrainings) * 1000) / 10
      : null,
  }));

  return {
    totalAssignments: eligibleEnrollments.length,
    status: REPORT_TRAINING_STATUSES.map((name) => ({ name, value: counts[name] })),
    statusCounts: counts,
    departments: departmentMetrics,
  };
}
