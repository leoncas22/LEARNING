import { useEffect, useState } from 'react';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { listAnnouncements } from '../../services/announcementService';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Primitives';

export default function Announcements() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); try { const result = await listAnnouncements(); setItems(result.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load announcements.'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <EmployeeLayout><div className="space-y-6"><div><h1 className="text-2xl font-semibold text-espresso">Announcements</h1><p className="text-sm text-espresso/60 mt-1">Updates from your organization.</p></div>{loading ? <LoadingState label="Loading announcements..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No announcements" /> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="bg-white border-border-warm rounded-2xl p-5"><h2 className="font-semibold text-espresso">{item.title}</h2><p className="text-xs text-espresso/50 mt-1">{item.department?.name || 'Company-wide'}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString()}` : ''}</p><p className="text-sm text-espresso/70 mt-3 whitespace-pre-wrap">{item.content}</p></article>)}</div>}</div></EmployeeLayout>;
}
