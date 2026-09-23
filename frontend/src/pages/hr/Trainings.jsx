import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import EnrollmentTable from '../../components/EnrollmentTable';
import AssignTrainingForm from '../../components/AssignTrainingForm';
import { Modal } from '../../components/ui/Modal';
import { SearchInput, FilterDropdown, Pagination, EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as trainingService from '../../services/trainingService';

const STATUSES = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
];

export default function Trainings() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trainings', { search, status, page }],
    queryFn: () => trainingService.listTrainings({ ...(search ? { search } : {}), ...(status ? { status } : {}), page, limit: 20 }),
  });

  function handleAssignSuccess() {
    queryClient.invalidateQueries({ queryKey: ['trainings'] });
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  }

  return (
    <HrLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-espresso">Trainings</h1>
          <p className="text-sm text-espresso/60 mt-1">Monitor training assignments across your company.</p>
        </div>
        <button
          type="button"
          onClick={() => setAssignModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
        >
          + Assign Training
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by employee or course..." />
        </div>
        <FilterDropdown label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} />
      </div>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading trainings..." />}
        {query.isError && <ErrorState message="Unable to load trainings." onRetry={query.refetch} />}
        {query.isSuccess && query.data.data.length === 0 && (
          <EmptyState title="No training assignments found." description="Assign a published course to your employees to get started." />
        )}
        {query.isSuccess && query.data.data.length > 0 && (
          <>
            <EnrollmentTable rows={query.data.data} showCourse />
            <Pagination page={page} totalPages={query.data.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={assignModalOpen} title="Assign Training" onClose={() => setAssignModalOpen(false)} wide>
        <AssignTrainingForm
          onCancel={() => { setAssignModalOpen(false); handleAssignSuccess(); }}
          onSubmit={async (payload) => {
            const result = await trainingService.assignTraining(payload);
            handleAssignSuccess();
            return result;
          }}
        />
      </Modal>
    </HrLayout>
  );
}
