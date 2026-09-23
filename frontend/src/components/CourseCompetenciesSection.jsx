import { useState, useEffect } from 'react';
import {
  listCourseCompetencies,
  assignCourseCompetency,
  removeCourseCompetency,
  listCompetencies,
} from '../services/competencyService';
import { StatusBadge } from './ui/Primitives';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export default function CourseCompetenciesSection({ courseId }) {
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('');
  const [targetLevel, setTargetLevel] = useState('INTERMEDIATE');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [assignedRes, allRes] = await Promise.all([
        listCourseCompetencies(courseId),
        listCompetencies({ limit: 100, status: 'ACTIVE' }),
      ]);
      setAssigned(assignedRes || []);
      setAvailable(allRes.data || []);
    } catch (err) {
      console.error('Failed to load course competencies', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [courseId]);

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedCompetencyId) return;

    setIsSubmitting(true);
    try {
      await assignCourseCompetency(courseId, {
        competencyId: selectedCompetencyId,
        targetLevel,
      });
      setSelectedCompetencyId('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign competency');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(competencyId) {
    if (!confirm('Remove this competency from the course?')) return;
    try {
      await removeCourseCompetency(courseId, competencyId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove competency');
    }
  }

  // Filter out already assigned from dropdown
  const assignedIds = new Set(assigned.map((a) => a.competencyId));
  const unassigned = available.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="mt-8 bg-white rounded-2xl border border-border-warm p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-espresso">Course Competencies</h2>
        <p className="text-xs text-espresso/60 mt-0.5">
          Define which capabilities and target proficiency levels learners earn upon course completion.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-espresso/50 py-3">Loading competencies...</p>
      ) : assigned.length === 0 ? (
        <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60 text-xs text-espresso/60">
          No competencies currently linked. When learners complete this course, they will not earn competency badges.
        </div>
      ) : (
        <div className="divide-y divide-border-warm/60 border-t border-b border-border-warm/60">
          {assigned.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm text-espresso">{item.competency.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-espresso/60">Target Level:</span>
                  <StatusBadge status={item.targetLevel} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(item.competencyId)}
                className="text-xs font-medium text-espresso/40 hover:text-burgundy px-2.5 py-1 rounded-lg hover:bg-burgundy/10 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Competency Form */}
      <form onSubmit={handleAssign} className="pt-2 flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-espresso/70 mb-1">
            Assign Competency
          </label>
          <select
            value={selectedCompetencyId}
            onChange={(e) => setSelectedCompetencyId(e.target.value)}
            className="w-full rounded-xl border border-border-warm px-3.5 py-2 text-xs text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            <option value="">Select a competency...</option>
            {unassigned.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.category ? `(${c.category})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-44">
          <label className="block text-xs font-medium text-espresso/70 mb-1">
            Target Level
          </label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className="w-full rounded-xl border border-border-warm px-3.5 py-2 text-xs text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!selectedCompetencyId || isSubmitting}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-espresso text-cream text-xs font-medium hover:bg-espresso/90 transition shadow-sm disabled:opacity-40"
        >
          {isSubmitting ? 'Adding...' : '+ Add Competency'}
        </button>
      </form>
    </div>
  );
}

