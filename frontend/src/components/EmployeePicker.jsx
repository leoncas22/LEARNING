import { useMemo, useState } from 'react';

export function EmployeePicker({ employees, selectedIds, onChange }) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');

  const departments = useMemo(() => {
    const map = new Map();
    for (const e of employees) {
      if (e.department) map.set(e.department.id, e.department.name);
    }
    return [...map.entries()];
  }, [employees]);

  const filtered = employees.filter((e) => {
    if (e.role?.name !== 'EMPLOYEE') return false;
    if (department && e.department?.id !== department) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));

  function toggle(id) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function toggleAll() {
    if (allFilteredSelected) {
      onChange(selectedIds.filter((id) => !filtered.some((e) => e.id === id)));
    } else {
      const merged = new Set([...selectedIds, ...filtered.map((e) => e.id)]);
      onChange([...merged]);
    }
  }

  return (
    <div className="border border-border-warm rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border-warm bg-cream/40">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="flex-1 min-w-[160px] rounded-lg border border-border-warm bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-border-warm bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          <option value="">All departments</option>
          {departments.map(([did, name]) => (
            <option key={did} value={did}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-espresso/70 ml-auto">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
          Select all
        </label>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border-warm/60">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-espresso/40 text-center">No employees match.</p>
        ) : (
          filtered.map((e) => (
            <label key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream/40 cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggle(e.id)} />
              <span className="text-espresso">{e.name}</span>
              {e.department && <span className="text-espresso/40 text-xs ml-auto">{e.department.name}</span>}
            </label>
          ))
        )}
      </div>
      <div className="px-4 py-2 bg-cream/40 text-xs text-espresso/60 border-t border-border-warm">
        {selectedIds.length} selected
      </div>
    </div>
  );
}

export default EmployeePicker;
