import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HrLayout from '../../layouts/HrLayout';
import { createCompetency } from '../../services/competencyService';

const INITIAL_LEVELS = [
  { level: 'BEGINNER', description: 'Foundational understanding and basic application of concepts', minScore: 0, maxScore: 59 },
  { level: 'INTERMEDIATE', description: 'Applies competency effectively with minimal supervision', minScore: 60, maxScore: 74 },
  { level: 'ADVANCED', description: 'Independently applies skills in complex, ambiguous scenarios', minScore: 75, maxScore: 89 },
  { level: 'EXPERT', description: 'Subject matter authority who coaches others and drives standards', minScore: 90, maxScore: 100 },
];

export default function CreateCompetency() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [levels, setLevels] = useState(INITIAL_LEVELS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleLevelChange(index, field, value) {
    const updated = [...levels];
    updated[index] = {
      ...updated[index],
      [field]: field.includes('Score') ? parseInt(value, 10) || 0 : value,
    };
    setLevels(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Competency name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      levels,
    };

    try {
      const created = await createCompetency(payload);
      navigate(`/hr/competencies/${created.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create competency');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <HrLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/hr/competencies" className="text-xs font-medium text-gold hover:underline">
            &larr; Back to Competencies
          </Link>
          <h1 className="text-2xl font-bold text-espresso mt-1">Create Competency</h1>
          <p className="text-sm text-espresso/60">
            Define a measurable capability and configure proficiency tiers
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-burgundy/10 text-burgundy text-sm border border-burgundy/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-espresso">General Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Competency Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Communication, Problem Solving, Leadership"
                  className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Soft Skills, Technical, Compliance"
                  className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the scope and definition of this competency..."
                className="w-full rounded-xl border border-border-warm px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          {/* Proficiency Levels Configuration */}
          <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-espresso">Proficiency Levels & Scoring Bands</h2>
              <p className="text-xs text-espresso/60 mt-0.5">
                Configure score thresholds (0–100%) and behavioural descriptions for each tier.
              </p>
            </div>

            <div className="space-y-4">
              {levels.map((lvl, idx) => (
                <div
                  key={lvl.level}
                  className="p-4 rounded-xl border border-border-warm/70 bg-cream/20 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-espresso">
                      {lvl.level}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-espresso/70">
                      <span>Score Range:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={lvl.minScore}
                        onChange={(e) => handleLevelChange(idx, 'minScore', e.target.value)}
                        className="w-16 rounded-lg border border-border-warm px-2 py-1 text-center bg-white"
                      />
                      <span>to</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={lvl.maxScore}
                        onChange={(e) => handleLevelChange(idx, 'maxScore', e.target.value)}
                        className="w-16 rounded-lg border border-border-warm px-2 py-1 text-center bg-white"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={lvl.description}
                      onChange={(e) => handleLevelChange(idx, 'description', e.target.value)}
                      placeholder={`Description for ${lvl.level.toLowerCase()} level...`}
                      className="w-full rounded-xl border border-border-warm px-3 py-2 text-xs text-espresso bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/hr/competencies"
              className="px-4 py-2.5 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Competency'}
            </button>
          </div>
        </form>
      </div>
    </HrLayout>
  );
}

