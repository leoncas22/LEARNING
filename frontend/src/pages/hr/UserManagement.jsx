import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import * as employeeService from '../../services/employeeService';
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput, StatusBadge } from '../../components/ui/Primitives';

const inputClass = 'w-full rounded-xl border-border-warm bg-white px-3 py-2.5 text-sm text-espresso';
const emptyForm = { name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', positionId: '', employeeNumber: '' };

export default function UserManagement() {
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const usersQuery = useQuery({ queryKey: ['managed-users', { search, role, status, page }], queryFn: () => employeeService.listEmployees({ search: search || undefined, role: role || undefined, status: status || undefined, page, limit: 20 }) });
  const optionsQuery = useQuery({ queryKey: ['managed-user-options'], queryFn: employeeService.getEmployeeOptions });
  const users = usersQuery.data?.data || [];
  const pagination = usersQuery.data?.pagination;
  const options = optionsQuery.data?.data || { departments: [], positions: [] };
  const selectedDepartment = form.departmentId;
  const positions = useMemo(() => options.positions || [], [options.positions]);

  function setField(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function resetForm() { setForm(emptyForm); setEditing(null); setError(''); }
  const save = useMutation({
    mutationFn: () => editing ? employeeService.updateEmployee(editing.id, { ...form, password: form.password || undefined, departmentId: form.departmentId || null, positionId: form.positionId || null, employeeNumber: form.employeeNumber || null }) : employeeService.createEmployee({ ...form, departmentId: form.departmentId || undefined, positionId: form.positionId || undefined, employeeNumber: form.employeeNumber || undefined }),
    onSuccess: () => { resetForm(); client.invalidateQueries({ queryKey: ['managed-users'] }); },
    onError: (err) => setError(err.response?.data?.message || 'Unable to save user.'),
  });
  const statusMutation = useMutation({ mutationFn: ({ id, nextStatus }) => employeeService.updateEmployeeStatus(id, nextStatus), onSuccess: () => client.invalidateQueries({ queryKey: ['managed-users'] }), onError: (err) => setError(err.response?.data?.message || 'Unable to update account status.') });

  function editUser(user) {
    setEditing(user);
    setForm({ name: user.name || '', email: user.email || '', password: '', role: user.role?.name || 'EMPLOYEE', departmentId: user.department?.id || '', positionId: user.position?.id || '', employeeNumber: user.employeeNumber || '' });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <HrLayout>
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-espresso">User Management</h1><p className="text-sm text-espresso/60 mt-1">Provision and manage accounts in your company.</p></div>
      <section className="bg-white border-border-warm rounded-2xl p-5">
        <h2 className="font-semibold text-espresso">{editing ? 'Edit user' : 'Create user'}</h2>
        <p className="text-xs text-espresso/50 mt-1">Login uses the existing email identifier. Passwords are hashed on the server.</p>
        <form className="grid md:grid-cols-2 gap-3 mt-4" onSubmit={(event) => { event.preventDefault(); setError(''); save.mutate(); }}>
          <input required minLength={2} aria-label="Name" placeholder="Full name" value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} />
          <input required type="email" aria-label="Email" placeholder="Username / email" value={form.email} onChange={(event) => setField('email', event.target.value)} className={inputClass} />
          <input required={!editing} minLength={8} type="password" aria-label="Initial password" placeholder={editing ? 'New password (optional)' : 'Initial password'} value={form.password} onChange={(event) => setField('password', event.target.value)} className={inputClass} />
          <select aria-label="Role" value={form.role} onChange={(event) => setField('role', event.target.value)} className={inputClass}><option value="EMPLOYEE">Employee</option><option value="INSTRUCTOR">Instructor</option><option value="COMPANY_ADMIN">Company Admin</option></select>
          <select aria-label="Department" value={selectedDepartment} onChange={(event) => setField('departmentId', event.target.value)} className={inputClass}><option value="">No department</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Position" value={form.positionId} onChange={(event) => setField('positionId', event.target.value)} className={inputClass}><option value="">No position</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input aria-label="Employee number" placeholder="Employee number (optional)" value={form.employeeNumber} onChange={(event) => setField('employeeNumber', event.target.value)} className={inputClass} />
          <div className="flex gap-2 items-center"><button disabled={save.isPending} className="px-4 py-2.5 rounded-xl bg-espresso text-white text-sm">{save.isPending ? 'Saving...' : editing ? 'Save changes' : 'Create account'}</button>{editing && <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl border-border-warm text-sm text-espresso">Cancel</button>}</div>
        </form>
        {error && <p className="mt-3 text-sm text-burgundy" role="alert">{error}</p>}
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3"><div className="flex-1 min-w-[220px]"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, email, or employee number" /></div><select aria-label="Filter role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className={inputClass + ' md:w-44'}><option value="">All roles</option><option value="EMPLOYEE">Employee</option><option value="INSTRUCTOR">Instructor</option><option value="COMPANY_ADMIN">Company Admin</option></select><select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass + ' md:w-36'}><option value="">All status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
        {usersQuery.isLoading && <LoadingState label="Loading users..." />}
        {usersQuery.isError && <ErrorState message="Unable to load users." onRetry={usersQuery.refetch} />}
        {usersQuery.isSuccess && users.length === 0 && <EmptyState title="No users found" description="Create an account or adjust the filters." />}
        {usersQuery.isSuccess && users.length > 0 && <div className="overflow-x-auto bg-white border-border-warm rounded-2xl"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-espresso/50 border-b border-border-warm"><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Department / Position</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-border-warm/60">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-medium text-espresso">{user.name}</p><p className="text-xs text-espresso/50">{user.email}</p><p className="text-xs text-espresso/40">Created {new Date(user.createdAt || Date.now()).toLocaleDateString()}</p></td><td className="px-5 py-4">{user.role?.name}</td><td className="px-5 py-4 text-espresso/60">{user.department?.name || '—'} / {user.position?.name || '—'}</td><td className="px-5 py-4"><StatusBadge status={user.status} /></td><td className="px-5 py-4"><div className="flex gap-3"><button type="button" onClick={() => editUser(user)} className="text-gold">Edit</button><button type="button" onClick={() => statusMutation.mutate({ id: user.id, nextStatus: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} className="text-burgundy">{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>}
        {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />}
      </section>
    </div>
  </HrLayout>;
}
