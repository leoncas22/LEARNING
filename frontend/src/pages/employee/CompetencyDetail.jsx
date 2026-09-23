import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { getMyCompetencyDetail } from '../../services/competencyService';
import { StatusBadge, ProgressBar, LoadingState, ErrorState } from '../../components/ui/Primitives';

export default function CompetencyDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getMyCompetencyDetail(id);
        setData(res);
      } catch (err) {
        setError(err.response?.data?.message || 'Competency details not found');
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <EmployeeLayout>
        <LoadingState label="Loading competency detail..." />
      </EmployeeLayout>
    );
  }

  if (error || !data) {
    return (
      <EmployeeLayout>
        <ErrorState message={error || 'Competency not found'} />
      </EmployeeLayout>
    );
  }

  const { competency, achievement, progress, completedSources } = data;

  return (
    <EmployeeLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/employee/competencies" className="text-xs font-medium text-gold hover:underline">
            &larr; Back to My Competencies
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-espresso">{competency.name}</h1>
            {achievement ? (
              <StatusBadge status={achievement.level} />
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-medium">
                Not Yet Earned
              </span>
            )}
            {competency.category && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-cream border border-border-warm font-medium text-espresso/70">
                {competency.category}
              </span>
            )}
          </div>
          <p className="text-sm text-espresso/60 mt-1">
            {competency.description || 'No description provided.'}
          </p>
        </div>

        {/* Current Score & Next Level Advancement Card */}
        <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-espresso">Proficiency Progress</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60 space-y-1">
              <span className="text-xs font-medium text-espresso/50 uppercase">Current Proficiency</span>
              <p className="text-2xl font-bold text-espresso">
                {achievement ? achievement.level : 'None'}
              </p>
              <p className="text-xs text-espresso/60">
                Score: <span className="font-semibold text-espresso">{achievement ? achievement.score : 0} / 100</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60 space-y-1">
              <span className="text-xs font-medium text-espresso/50 uppercase">Next Tier</span>
              <p className="text-2xl font-bold text-gold">
                {progress?.nextLevel || 'Max Level'}
              </p>
              <p className="text-xs text-espresso/60">
                {progress?.nextLevel ? (
                  <>Needs <span className="font-semibold text-espresso">{progress.scoreNeeded} points</span> to reach {progress.nextLevel}</>
                ) : (
                  'Top proficiency tier achieved'
                )}
              </p>
            </div>
          </div>

          <div>
            <ProgressBar value={achievement ? achievement.score : 0} />
          </div>

          {/* Level Bands Reference */}
          <div className="pt-2 border-t border-border-warm/60">
            <p className="text-xs font-medium text-espresso/60 mb-2">Proficiency Tiers Guide:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {competency.levels?.map((lvl) => (
                <div
                  key={lvl.level}
                  className={`p-2.5 rounded-xl border text-center ${
                    achievement?.level === lvl.level
                      ? 'border-gold bg-gold/10 font-bold text-espresso'
                      : 'border-border-warm bg-white text-espresso/70'
                  }`}
                >
                  <p className="font-semibold">{lvl.level}</p>
                  <p className="text-[11px] text-espresso/50">{lvl.minScore}–{lvl.maxScore}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contributing Learning Sources */}
        <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-espresso">
              Completed Learning Sources ({completedSources?.length || 0})
            </h2>
            <p className="text-xs text-espresso/50 mt-0.5">
              Courses you have completed that contributed to earning and advancing this competency
            </p>
          </div>

          {!completedSources || completedSources.length === 0 ? (
            <div className="text-center py-6 px-4 text-xs text-espresso/50 bg-cream/20 rounded-xl border border-border-warm/50">
              No completed courses on record for this competency yet. Complete relevant training courses to elevate your score.
            </div>
          ) : (
            <div className="divide-y divide-border-warm/60">
              {completedSources.map((src) => (
                <div key={src.courseId} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      to={`/employee/courses/${src.courseId}`}
                      className="text-sm font-medium text-espresso hover:text-gold transition block"
                    >
                      {src.courseTitle}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-espresso/50 mt-0.5">
                      <span>Target: {src.targetLevel}</span>
                      <span>&bull;</span>
                      <span>Completed: {new Date(src.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link
                    to={`/employee/courses/${src.courseId}`}
                    className="text-xs font-medium text-gold hover:underline whitespace-nowrap"
                  >
                    View Course &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Non-evaluative disclaimer */}
        <div className="p-4 rounded-xl bg-cream/40 border border-border-warm/60 text-xs text-espresso/60 leading-relaxed">
          <span className="font-semibold text-espresso">Note:</span> This capability indicator reflects learning progress and assessment results within the learning management platform. It serves as an educational benchmark and is not a formal performance appraisal or compensation metric.
        </div>
      </div>
    </EmployeeLayout>
  );
}

