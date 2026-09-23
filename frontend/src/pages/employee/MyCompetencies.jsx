import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { getMyCompetencies } from '../../services/competencyService';
import { StatusBadge, LoadingState, EmptyState, ErrorState } from '../../components/ui/Primitives';

export default function MyCompetencies() {
  const [competencies, setCompetencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyCompetencies();
      setCompetencies(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your competencies');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-espresso">My Competencies</h1>
          <p className="text-sm text-espresso/60 mt-1">
            Proficiency ratings and skills earned across your training courses and assessments
          </p>
        </div>

        {isLoading ? (
          <LoadingState label="Loading competencies..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : competencies.length === 0 ? (
          <EmptyState
            title="No competencies achieved yet"
            description="Complete assigned training courses and assessments to unlock and advance your competency levels."
            action={
              <Link
                to="/employee/courses"
                className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
              >
                Browse My Learning
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {competencies.map((comp) => (
              <Link
                key={comp.id}
                to={`/employee/competencies/${comp.competencyId}`}
                className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-gold hover:shadow-md transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-cream font-medium text-espresso/60 border border-border-warm/60">
                      {comp.category || 'General'}
                    </span>
                    <StatusBadge status={comp.level} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-espresso group-hover:text-gold transition">
                      {comp.name}
                    </h2>
                    {comp.description && (
                      <p className="text-xs text-espresso/50 line-clamp-2 mt-1">
                        {comp.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border-warm/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-espresso/60">Competency Score:</span>
                    <span className="font-bold text-espresso font-mono text-sm">{comp.score}%</span>
                  </div>

                  {/* Progress to next tier indicator */}
                  {comp.nextLevel ? (
                    <div className="text-[11px] text-espresso/60 flex items-center justify-between">
                      <span>Next Level: <span className="font-semibold text-espresso">{comp.nextLevel}</span></span>
                      <span>Need {comp.scoreNeeded} pts</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      ✓ Maximum proficiency level achieved
                    </div>
                  )}

                  <div className="text-[10px] text-espresso/40 pt-1">
                    Last updated: {new Date(comp.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}

