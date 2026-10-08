import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import * as departmentService from '../../services/departmentService';
import { EmptyState, ErrorState, LoadingState, useConfirm } from '../../components/ui/Primitives';

const inputClass = 'w-full rounded-xl border-border-warm bg-white px-3 py-2.5 text-sm text-espresso';

export default function Departments() {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const departmentsQuery = useQuery({ queryKey: ['departments'], queryFn: departmentService.listDepartments });

  const createMutation = useMutation({
    mutationFn: departmentService.createDepartment,
    onSuccess: () => {
      setForm({ name: '', description: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['managed-user-options'] });
    },
    onError: (err) => setError(err.response?.data?.message || 'Unable to create department.'),
  });

  const deleteMutation = useMutation({
    mutationFn: departmentService.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['managed-user-options'] });
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
    },
    onError: (err) => setError(err.response?.data?.message || 'Unable to delete department.'),
  });

  async function handleDelete(department) {
    const accepted = await confirm({
      title: `Delete ${department.name}?`,
      description: 'Deleting this department will not delete users, but users assigned to it will become unassigned.',
      confirmLabel: 'Delete department',
      danger: true,
    });
    if (accepted) deleteMutation.mutate(department.id);
  }

  return <HrLayout>
    {dialog}
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-espresso">Departments</h1><p className="text-sm text-espresso/60 mt-1">Manage departments for your company.</p></div>
      <section className="bg-white border-border-warm rounded-2xl p-5">
        <h2 className="font-semibold text-espresso">Create department</h2>
        <form className="grid md:grid-cols-[1fr_1.5fr_auto] gap-3 mt-4 items-start" onSubmit={(event) => { event.preventDefault(); setError(''); createMutation.mutate(form); }}>
          <input required minLength={2} maxLength={100} aria-label="Department name" placeholder="Department name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />
          <input maxLength={500} aria-label="Description" placeholder="Description (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} />
          <button disabled={createMutation.isPending} className="px-4 py-2.5 rounded-xl bg-espresso text-white text-sm font-medium disabled:opacity-50">{createMutation.isPending ? 'Creating...' : 'Create department'}</button>
        </form>
        {error && <p className="mt-3 text-sm text-burgundy" role="alert">{error}</p>}
      </section>
      <section className="bg-white border-border-warm rounded-2xl overflow-hidden">
        {departmentsQuery.isLoading && <LoadingState label="Loading departments..." />}
        {departmentsQuery.isError && <ErrorState message="Unable to load departments." onRetry={departmentsQuery.refetch} />}
        {departmentsQuery.isSuccess && departmentsQuery.data.length === 0 && <EmptyState title="No departments yet" description="Create a department to organize your users." />}
        {departmentsQuery.isSuccess && departmentsQuery.data.length > 0 && <div className="divide-y divide-border-warm/60">{departmentsQuery.data.map((department) => <div key={department.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><h2 className="font-medium text-espresso">{department.name}</h2><p className="text-sm text-espresso/60 mt-1">{department.description || 'No description'}</p></div><button type="button" onClick={() => handleDelete(department)} disabled={deleteMutation.isPending} className="text-sm text-burgundy hover:underline disabled:opacity-50">Delete</button></div>)}</div>}
      </section>
    </div>
  </HrLayout>;
}
