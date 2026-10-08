import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import EmployeePicker from './EmployeePicker';
import * as courseService from '../services/courseService';
import * as employeeService from '../services/employeeService';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

export function AssignTrainingForm({ onSubmit, onCancel }) {
  const [courseId, setCourseId] = useState('');
  const [employeeIds, setEmployeeIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ['courses', { status: 'PUBLISHED', forAssignment: true }],
    queryFn: () => courseService.listCourses({ status: 'PUBLISHED', limit: 100 }),
  });
  const employeesQuery = useQuery({
    queryKey: ['employees', { role: 'EMPLOYEE', status: 'ACTIVE' }],
    queryFn: () => employeeService.listEmployees({ role: 'EMPLOYEE', status: 'ACTIVE', limit: 100 }),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await onSubmit({ courseId, employeeIds, dueDate: dueDate || undefined });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="text-sm">
        <div className="rounded-xl border border-border-warm bg-cream/40 px-4 py-3 space-y-1">
          <p className="text-espresso">
            Successfully assigned: <span className="font-semibold">{result.assigned}</span>
          </p>
          <p className="text-espresso/60">
            Already assigned: <span className="font-medium">{result.alreadyAssigned}</span>
          </p>
        </div>
        <div className="flex justify-end mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-2.5">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Course</label>
        {coursesQuery.isLoading && <p className="text-sm text-espresso/50">Loading published courses...</p>}
        {coursesQuery.isError && <p className="text-sm text-burgundy" role="alert">Unable to load published courses. Please try again.</p>}
        <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputClass} disabled={!coursesQuery.isSuccess}>
          <option value="">Select a published course</option>
          {(coursesQuery.data?.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {coursesQuery.isSuccess && coursesQuery.data.data.length === 0 && (
          <p className="mt-1.5 text-xs text-espresso/50">No published courses yet — publish a course first.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Employees</label>
        {employeesQuery.isLoading && <p className="text-sm text-espresso/50">Loading active employees...</p>}
        {employeesQuery.isError && <p className="text-sm text-burgundy" role="alert">Unable to load employees. Please try again.</p>}
        {employeesQuery.isSuccess && (employeesQuery.data?.data || []).length === 0 && <p className="text-sm text-espresso/50">No active employees yet — create one in User Management first.</p>}
        {employeesQuery.isSuccess && (employeesQuery.data?.data || []).length > 0 && (
          <EmployeePicker employees={employeesQuery.data?.data || []} selectedIds={employeeIds} onChange={setEmployeeIds} />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Due Date</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || employeeIds.length === 0 || !courseId}
          className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Assigning...' : 'Assign Training'}
        </button>
      </div>
    </form>
  );
}

export default AssignTrainingForm;
