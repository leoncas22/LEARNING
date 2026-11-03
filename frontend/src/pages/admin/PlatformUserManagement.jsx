import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import * as platformAdminService from '../../services/platformAdminService';
import { EmptyState, ErrorState, LoadingState, Pagination, StatusBadge, useConfirm } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'INSTRUCTOR', label: 'Instructor' },
  { value: 'EMPLOYEE', label: 'Employee' },
];
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];
const inputClass = 'mt-1 w-full rounded-xl border border-border-warm bg-white px-3 py-2.5 text-sm text-espresso focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:bg-cream/50 disabled:text-espresso/45';
const initialForm = { name: '', email: '', password: '', role: 'EMPLOYEE', companyId: '', status: 'ACTIVE', employeeNumber: '' };

function displayRole(role) { return role?.replaceAll('_', ' ') || 'Unknown'; }

export default function PlatformUserManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const params = useMemo(() => ({ search: search.trim() || undefined, role: roleFilter || undefined, status: statusFilter || undefined, companyId: companyFilter || undefined, page, limit: 20 }), [search, roleFilter, statusFilter, companyFilter, page]);
  const usersQuery = useQuery({ queryKey: ['platform-users', params], queryFn: () => platformAdminService.listUsers(params), placeholderData: (previous) => previous });
  const companiesQuery = useQuery({ queryKey: ['platform-company-options'], queryFn: () => platformAdminService.listCompanies({ page: 1, limit: 100 }) });
  const users = usersQuery.data?.data || [];
  const pagination = usersQuery.data?.pagination;
  const companies = companiesQuery.data?.data || [];
  const isPlatformRole = form.role === 'SUPER_ADMIN';
  const editingSelf = Boolean(editing && editing.id === currentUser?.id);

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditing(null);
    setFormOpen(false);
    setError('');
  }

  function startCreate() {
    setEditing(null);
    setForm(initialForm);
    setFormOpen(true);
    setError('');
    setNotice('');
  }

  function startEdit(target) {
    setEditing(target);
    setForm({
      name: target.name || '',
      email: target.email || '',
      password: '',
      role: target.role?.name || 'EMPLOYEE',
      companyId: target.companyId || '',
      status: target.status || 'ACTIVE',
      employeeNumber: target.employeeNumber || '',
    });
    setFormOpen(true);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const saveMutation = useMutation({
    mutationFn: ({ editingId, payload }) => editingId
      ? platformAdminService.updateUser(editingId, payload)
      : platformAdminService.createUser(payload),
    onSuccess: (_result, variables) => {
      resetForm();
      setNotice(variables.editingId ? 'User updated successfully.' : 'User created successfully.');
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['platform-company-options'] });
    },
    onError: (err) => { setNotice(''); setError(err.response?.data?.message || 'Unable to save user.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => platformAdminService.deleteUser(id),
    onSuccess: (_data, id) => {
      setNotice('User access has been revoked and the account was soft-deleted.');
      setError('');
      if (editing?.id === id) resetForm();
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
    },
    onError: (err) => { setNotice(''); setError(err.response?.data?.message || 'Unable to delete user.'); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => platformAdminService.updateUser(id, { status }),
    onSuccess: (_data, variables) => {
      setNotice(`User account ${variables.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
    },
    onError: (err) => { setNotice(''); setError(err.response?.data?.message || 'Unable to update account status.'); },
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (!editing && !form.password) {
      setError('A temporary password is required for a new account.');
      return;
    }
    if (!isPlatformRole && !form.companyId) {
      setError('Select a company for this role.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      status: form.status,
      companyId: isPlatformRole ? null : form.companyId,
      employeeNumber: form.employeeNumber.trim() || null,
      ...(form.password ? { password: form.password } : {}),
    };
    if (editingSelf) {
      delete payload.role;
      delete payload.status;
      delete payload.companyId;
      delete payload.password;
    }
    saveMutation.mutate({ editingId: editing?.id, payload });
  }

  async function handleDelete(target) {
    const accepted = await confirm({
      title: 'Delete this user?',
      description: `This will revoke active sessions and soft-delete ${target.name} (${target.email}). Learning history and audit records are retained; this action is not a hard delete.`,
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (accepted) deleteMutation.mutate(target.id);
  }

  async function handleToggleStatus(target) {
    const nextStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const accepted = await confirm({
      title: `${nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} this account?`,
      description: `${target.name} will ${nextStatus === 'ACTIVE' ? 'be able to' : 'no longer be able to'} sign in${nextStatus === 'ACTIVE' ? '' : ', and active refresh sessions will be revoked'}.`,
      confirmLabel: nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate',
      danger: nextStatus !== 'ACTIVE',
    });
    if (accepted) statusMutation.mutate({ id: target.id, status: nextStatus });
  }

  return <AdminLayout>
    {dialog}
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Platform control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">User management</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/60">Manage accounts across all companies. Role, company assignment, and account status are enforced again by the backend.</p></div><button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white hover:bg-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Plus size={17} /> Add user</button></header>

    {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {error && !formOpen && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

    {formOpen && <section className="mt-6 rounded-2xl border border-border-warm bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{editing ? 'Account details' : 'New account'}</p><h2 className="mt-1 text-lg font-semibold text-espresso">{editing ? `Edit ${editing.name}` : 'Create a platform user'}</h2><p className="mt-1 text-sm text-espresso/55">Passwords are hashed on the server. Secrets are never returned in the response.</p></div><button type="button" aria-label="Close user form" onClick={resetForm} className="grid h-9 w-9 place-items-center rounded-lg text-espresso/60 hover:bg-cream"><X size={18} /></button></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-espresso">Full name<input className={inputClass} value={form.name} onChange={(event) => setField('name', event.target.value)} minLength={2} maxLength={150} required autoComplete="name" /></label>
        <label className="text-sm font-medium text-espresso">Email<input type="email" className={inputClass} value={form.email} onChange={(event) => setField('email', event.target.value)} required autoComplete="email" /></label>
        <label className="text-sm font-medium text-espresso">Role<select className={inputClass} value={form.role} onChange={(event) => { const nextRole = event.target.value; setField('role', nextRole); if (nextRole === 'SUPER_ADMIN') setField('companyId', ''); }} disabled={editingSelf} required>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm font-medium text-espresso">Company{isPlatformRole && <span className="ml-1 text-xs font-normal text-espresso/45">Not applicable for Super Admin</span>}<select className={inputClass} value={isPlatformRole ? '' : form.companyId} onChange={(event) => setField('companyId', event.target.value)} disabled={isPlatformRole || editingSelf} required={!isPlatformRole}><option value="">{isPlatformRole ? 'Platform-level account' : 'Select a company'}</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name} · {company.status}</option>)}</select>{companiesQuery.isError && <span className="mt-1 block text-xs text-burgundy">Company options failed to load. Retry the page.</span>}</label>
        <label className="text-sm font-medium text-espresso">Account status<select className={inputClass} value={form.status} onChange={(event) => setField('status', event.target.value)} disabled={!editing || editingSelf} required>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm font-medium text-espresso">Employee number <span className="font-normal text-espresso/40">(optional)</span><input className={inputClass} value={form.employeeNumber} onChange={(event) => setField('employeeNumber', event.target.value)} maxLength={100} /></label>
        <label className="text-sm font-medium text-espresso sm:col-span-2 xl:col-span-1">{editing ? 'New password (optional)' : 'Temporary password'}<input type="password" className={inputClass} value={form.password} onChange={(event) => setField('password', event.target.value)} required={!editing} autoComplete="new-password" minLength={8} placeholder={editing ? 'Leave blank to keep current password' : 'Set a secure temporary password'} disabled={editingSelf} /></label>
        {editingSelf && <p className="sm:col-span-2 xl:col-span-2 self-center text-xs leading-5 text-espresso/50">Your own role, status, company assignment, and password cannot be changed from this screen.</p>}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-3"><button type="submit" disabled={saveMutation.isPending || companiesQuery.isLoading} className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white hover:bg-burgundy disabled:cursor-not-allowed disabled:opacity-50">{saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</button><button type="button" onClick={resetForm} className="rounded-xl border border-border-warm px-4 py-2.5 text-sm font-medium text-espresso hover:bg-cream">Cancel</button><span className="text-xs text-espresso/45">{isPlatformRole ? 'Super Admin accounts are platform-level and have no company.' : 'The selected company determines tenant access.'}</span></div>
      </form>
    </section>}

    <section className="mt-7 rounded-2xl border border-border-warm bg-white p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,210px))]"><label className="relative block"><span className="sr-only">Search users</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/35" size={16} /><input className="w-full rounded-xl border border-border-warm bg-white py-2.5 pl-9 pr-3 text-sm text-espresso focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="Search name, email, employee no." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <label className="text-sm"><span className="sr-only">Filter by role</span><select className={inputClass.replace('mt-1 ', '')} value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}><option value="">All roles</option>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="text-sm"><span className="sr-only">Filter by status</span><select className={inputClass.replace('mt-1 ', '')} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="text-sm"><span className="sr-only">Filter by company</span><select className={inputClass.replace('mt-1 ', '')} value={companyFilter} onChange={(event) => { setCompanyFilter(event.target.value); setPage(1); }}><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
    </div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-espresso/50"><span>{pagination ? `${pagination.total.toLocaleString()} user accounts` : 'User directory'}</span><button type="button" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setCompanyFilter(''); setPage(1); }} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-cream hover:text-espresso"><RefreshCw size={13} /> Reset filters</button></div></section>

    {usersQuery.isLoading && <LoadingState label="Loading platform users…" />}
    {usersQuery.isError && <ErrorState message="The global user directory could not be loaded." onRetry={usersQuery.refetch} />}
    {usersQuery.isSuccess && users.length === 0 && <div className="mt-4 rounded-2xl border border-border-warm bg-white"><EmptyState title="No matching users" description="Try changing the search or filters, or create a new account." action={<button type="button" onClick={startCreate} className="rounded-xl bg-espresso px-4 py-2 text-sm font-medium text-white hover:bg-burgundy"><Plus size={15} className="mr-1 inline" />Add user</button>} /></div>}
    {usersQuery.isSuccess && users.length > 0 && <section className="mt-4 overflow-hidden rounded-2xl border border-border-warm bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[930px] text-left text-sm"><thead className="bg-cream/50"><tr className="border-b border-border-warm text-xs text-espresso/55"><th className="px-5 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Company</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Last login</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{users.map((target) => { const isSelf = target.id === currentUser?.id; return <tr key={target.id} className="border-b border-border-warm/70 last:border-0 hover:bg-cream/20"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-gold"><UserRound size={17} /></span><div className="min-w-0"><p className="font-semibold text-espresso">{target.name}{isSelf && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gold">You</span>}</p><p className="mt-0.5 text-xs text-espresso/50">{target.email}</p>{target.employeeNumber && <p className="mt-0.5 text-[11px] text-espresso/40">{target.employeeNumber}</p>}</div></div></td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-espresso"><ShieldCheck size={13} className="text-gold" />{displayRole(target.role?.name)}</span></td><td className="px-4 py-4"><p className="text-espresso/75">{target.company?.name || 'Platform-level'}</p>{target.department?.name && <p className="mt-0.5 text-xs text-espresso/45">{target.department.name}</p>}</td><td className="px-4 py-4"><StatusBadge status={target.status} /></td><td className="px-4 py-4 text-xs text-espresso/55">{target.lastLoginAt ? new Date(target.lastLoginAt).toLocaleDateString() : 'Never'}</td><td className="px-5 py-4"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => startEdit(target)} className="inline-flex items-center gap-1.5 rounded-lg border border-border-warm px-2.5 py-2 text-xs font-medium text-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Edit3 size={13} />Edit</button>{!isSelf && <><button type="button" onClick={() => handleToggleStatus(target)} disabled={statusMutation.isPending} className="rounded-lg border border-border-warm px-2.5 py-2 text-xs font-medium text-espresso hover:bg-cream disabled:opacity-50">{target.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => handleDelete(target)} disabled={deleteMutation.isPending} aria-label={`Delete ${target.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-burgundy hover:bg-burgundy/10 disabled:opacity-50"><Trash2 size={15} /></button></>}</div></td></tr>; })}</tbody></table></div>{pagination && <div className="border-t border-border-warm px-4 pb-4"><Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} /></div>}</section>}
  </AdminLayout>;
}
