import { useEffect, useState } from 'react';
import HrLayout from '../../layouts/HrLayout';
import { archiveAnnouncement, createAnnouncement, listAnnouncements, publishAnnouncement } from '../../services/announcementService';
import { listEmployees } from '../../services/employeeService';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../components/ui/Primitives';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', audience: 'COMPANY', departmentId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const result = await listAnnouncements(); setItems(result.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load announcements.'); } finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    listEmployees().then((employees) => {
      const unique = new Map();
      employees.forEach((employee) => { if (employee.department) unique.set(employee.department.id, employee.department); });
      setDepartments([...unique.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(() => setDepartments([]));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitError('');
    try {
      await createAnnouncement({ ...form, departmentId: form.audience === 'DEPARTMENT' ? form.departmentId : null });
      setForm({ title: '', content: '', audience: 'COMPANY', departmentId: '' });
      load();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Unable to create announcement.');
    }
  }

  async function changeStatus(item) {
    if (item.status === 'DRAFT') await publishAnnouncement(item.id); else if (item.status === 'PUBLISHED') await archiveAnnouncement(item.id);
    load();
  }

  return <HrLayout>
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-espresso">Announcements</h1><p className="text-sm text-espresso/60 mt-1">Share important updates with employees.</p></div>
      <form onSubmit={submit} className="bg-white border-border-warm rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-espresso">Create announcement</h2>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm" required />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Message" rows="4" className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm" required />
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value, departmentId: '' })} className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm">
          <option value="COMPANY">All employees</option>
          <option value="DEPARTMENT">A department</option>
        </select>
        {form.audience === 'DEPARTMENT' && <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full rounded-xl border-border-warm px-3 py-2.5 text-sm" required><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>}
        {submitError && <p className="text-sm text-burgundy" role="alert">{submitError}</p>}
        <button className="px-4 py-2 rounded-xl bg-espresso text-white text-sm">Save draft</button>
      </form>
      {loading ? <LoadingState label="Loading announcements..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No announcements yet" /> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="bg-white border-border-warm rounded-2xl p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold text-espresso">{item.title}</h2><p className="text-xs text-espresso/50 mt-1">{item.department?.name || 'All employees'}</p></div><StatusBadge status={item.status} /></div><p className="text-sm text-espresso/70 mt-3 whitespace-pre-wrap">{item.content}</p><button type="button" onClick={() => changeStatus(item)} className="mt-4 text-sm text-gold hover:text-burgundy">{item.status === 'DRAFT' ? 'Publish' : item.status === 'PUBLISHED' ? 'Archive' : ''}</button></article>)}</div>}
    </div>
  </HrLayout>;
}
