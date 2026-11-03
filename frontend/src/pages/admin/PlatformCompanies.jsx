import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, ShieldCheck } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import * as platformAdminService from '../../services/platformAdminService';
import { EmptyState, ErrorState, LoadingState, Pagination, StatusBadge, useConfirm } from '../../components/ui/Primitives';

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const inputClass = 'w-full rounded-xl border border-border-warm bg-white px-3 py-2.5 text-sm text-espresso focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20';

export default function PlatformCompanies() {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = { search: search.trim() || undefined, status: status || undefined, page, limit: 20 };
  const query = useQuery({ queryKey: ['platform-companies', params], queryFn: () => platformAdminService.listCompanies(params), placeholderData: (previous) => previous });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: ({ id, status: nextStatus }) => platformAdminService.updateCompanyStatus(id, nextStatus),
    onSuccess: (_data, variables) => {
      setError('');
      setNotice(`Company status changed to ${variables.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['platform-company-options'] });
    },
    onError: (err) => { setNotice(''); setError(err.response?.data?.message || 'Unable to update company status.'); },
  });

  async function changeStatus(company, nextStatus) {
    if (nextStatus === company.status) return;
    const accepted = await confirm({
      title: `Change ${company.name} status?`,
      description: nextStatus === 'SUSPENDED'
        ? 'Suspending a company blocks its company-scoped users from accessing the LMS. Their account data remains intact.'
        : nextStatus === 'INACTIVE'
          ? 'Inactive company users will be unable to sign in. This can be reversed later.'
          : 'Activating this company restores company-level access for eligible active users.',
      confirmLabel: `Set ${nextStatus.toLowerCase()}`,
      danger: nextStatus !== 'ACTIVE',
    });
    if (accepted) mutation.mutate({ id: company.id, status: nextStatus });
  }

  const companies = query.data?.data || [];
  const pagination = query.data?.pagination;

  return <AdminLayout>
    {dialog}
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Platform control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">Companies</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/60">Review registered organizations and control access by changing company status. Companies are not hard-deleted, preserving their learning and audit history.</p></header>
    {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    <section className="mt-6 rounded-2xl border border-border-warm bg-white p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px]"><label className="relative block"><span className="sr-only">Search companies</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/35" /><input className={`${inputClass} pl-9`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search company, slug, email" /></label><label><span className="sr-only">Filter by status</span><select className={inputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select></label></div><p className="mt-3 text-xs text-espresso/50">{pagination ? `${pagination.total.toLocaleString()} companies` : 'Company directory'}</p></section>
    {query.isLoading && <LoadingState label="Loading companies…" />}
    {query.isError && <ErrorState message="The company directory could not be loaded." onRetry={query.refetch} />}
    {query.isSuccess && companies.length === 0 && <div className="mt-4 rounded-2xl border border-border-warm bg-white"><EmptyState title="No companies found" description="Try another search or status filter." /></div>}
    {query.isSuccess && companies.length > 0 && <section className="mt-4 overflow-hidden rounded-2xl border border-border-warm bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-cream/50"><tr className="border-b border-border-warm text-xs text-espresso/55"><th className="px-5 py-3 font-medium">Organization</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Users</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Change status</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id} className="border-b border-border-warm/70 last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-gold"><Building2 size={18} /></span><div className="min-w-0"><p className="font-semibold text-espresso">{company.name}</p><p className="mt-0.5 text-xs text-espresso/50">{company.slug}</p>{company.email && <p className="mt-0.5 text-xs text-espresso/45">{company.email}</p>}</div></div></td><td className="px-4 py-4"><span className="rounded-lg bg-cream px-2 py-1 text-xs font-medium text-espresso">{company.subscriptionPlan || 'FREE'}</span></td><td className="px-4 py-4 text-espresso/70">{Number(company.userCount || 0).toLocaleString()}</td><td className="px-4 py-4"><StatusBadge status={company.status} /></td><td className="px-5 py-4"><label className="flex items-center gap-2"><ShieldCheck size={15} className="shrink-0 text-gold" /><span className="sr-only">Status for {company.name}</span><select className="rounded-lg border border-border-warm bg-white px-2.5 py-2 text-xs text-espresso focus:outline-none focus:ring-2 focus:ring-gold/30" value={company.status} onChange={(event) => changeStatus(company, event.target.value)} disabled={mutation.isPending}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option></select></label></td></tr>)}</tbody></table></div>{pagination && <div className="border-t border-border-warm px-4 pb-4"><Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} /></div>}</section>}
  </AdminLayout>;
}
