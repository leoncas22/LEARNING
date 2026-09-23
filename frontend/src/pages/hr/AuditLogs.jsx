import { useEffect, useState } from 'react';
import HrLayout from '../../layouts/HrLayout';
import { listAuditLogs } from '../../services/auditLogService';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Primitives';

export default function AuditLogs() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); try { const result = await listAuditLogs(); setItems(result.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load audit logs.'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  return <HrLayout><div><h1 className="text-2xl font-semibold text-espresso">Audit log</h1><p className="text-sm text-espresso/60 mt-1">Review company activity and administrative changes.</p>{loading ? <LoadingState label="Loading audit log..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No activity recorded" /> : <div className="mt-6 overflow-x-auto rounded-2xl border-border-warm bg-white"><table className="w-full text-left text-sm"><thead className="bg-cream/50"><tr><th className="p-4">Time</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Entity</th></tr></thead><tbody className="divide-y divide-border-warm/60">{items.map((item) => <tr key={item.id}><td className="p-4 text-espresso/60">{new Date(item.createdAt).toLocaleString()}</td><td className="p-4">{item.user?.name || 'System'}</td><td className="p-4">{item.action}</td><td className="p-4">{item.entity}</td></tr>)}</tbody></table></div>}</div></HrLayout>;
}
