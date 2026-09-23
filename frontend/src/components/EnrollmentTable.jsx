import { ProgressBar, StatusBadge } from './ui/Primitives';

export function EnrollmentTable({ rows, showCourse = false }) {
  return (
    <div className="overflow-x-auto border border-border-warm rounded-2xl bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-espresso/50 uppercase tracking-wide border-b border-border-warm">
            <th className="px-5 py-3 font-medium">Employee</th>
            <th className="px-5 py-3 font-medium">Department</th>
            {showCourse && <th className="px-5 py-3 font-medium">Course</th>}
            <th className="px-5 py-3 font-medium">Progress</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Due Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-warm/60">
          {rows.map((row) => (
            <tr key={row.enrollmentId || row.id}>
              <td className="px-5 py-3 text-espresso font-medium">{row.user?.name || row.employee?.name}</td>
              <td className="px-5 py-3 text-espresso/60">{row.user?.department?.name || row.department?.name || '—'}</td>
              {showCourse && <td className="px-5 py-3 text-espresso/60">{row.course?.title}</td>}
              <td className="px-5 py-3 w-40">
                <ProgressBar value={row.progress} />
              </td>
              <td className="px-5 py-3">
                <StatusBadge status={row.status} overdue={row.overdue} />
              </td>
              <td className="px-5 py-3 text-espresso/60">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EnrollmentTable;
