import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import * as courseService from '../../services/courseService';
import * as employeeService from '../../services/employeeService';

const initialForm = {
  title: '',
  description: '',
  thumbnail: '',
  category: '',
  difficulty: 'BEGINNER',
  duration: '',
  instructorId: '',
};

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

function TextInput(props) {
  return <input {...props} className={inputClass} />;
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-burgundy">{error}</p>}
    </div>
  );
}

export default function CreateCourse() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const instructorsQuery = useQuery({
    queryKey: ['employees', { role: 'INSTRUCTOR', status: 'ACTIVE' }],
    queryFn: () => employeeService.listEmployees({ role: 'INSTRUCTOR', status: 'ACTIVE', limit: 100 }),
  });
  const instructors = instructorsQuery.data?.data || [];

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        duration: form.duration ? Number(form.duration) : undefined,
        thumbnail: form.thumbnail || undefined,
      };
      const course = await courseService.createCourse(payload);
      navigate(`/hr/courses/${course.id}`, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) {
        setFieldErrors(data.details);
      } else {
        setError(data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <HrLayout>
      <div className="max-w-2xl">
        <Link to="/hr/courses" className="text-sm text-gold hover:underline">
          ← Back to courses
        </Link>
        <h1 className="text-2xl font-semibold text-espresso mt-3">Create Course</h1>
        <p className="text-sm text-espresso/60 mt-1">
          New courses start as a draft — publish once modules and lessons are ready.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 bg-white border border-border-warm rounded-2xl p-6 space-y-5">
          <Field label="Course Title" error={fieldErrors.title}>
            <TextInput required value={form.title} onChange={update('title')} />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={update('description')}
              className={inputClass}
            />
          </Field>
          <Field label="Thumbnail URL" error={fieldErrors.thumbnail}>
            <TextInput value={form.thumbnail} onChange={update('thumbnail')} placeholder="https://..." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" error={fieldErrors.category}>
              <TextInput required value={form.category} onChange={update('category')} placeholder="Onboarding" />
            </Field>
            <Field label="Difficulty" error={fieldErrors.difficulty}>
              <select required value={form.difficulty} onChange={update('difficulty')} className={inputClass}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Duration (minutes)" error={fieldErrors.duration}>
              <TextInput type="number" min="1" value={form.duration} onChange={update('duration')} />
            </Field>
            <Field label="Instructor" error={fieldErrors.instructorId}>
              {instructorsQuery.isLoading ? (
                <p className="text-sm text-espresso/50">Loading active instructors...</p>
              ) : instructorsQuery.isError ? (
                <p className="text-sm text-burgundy" role="alert">Unable to load instructors. Please try again.</p>
              ) : (
                <>
                  <select required value={form.instructorId} onChange={update('instructorId')} className={inputClass}>
                    <option value="">Select instructor</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  {instructors.length === 0 && (
                    <p className="mt-1.5 text-xs text-espresso/50">
                      No active instructors yet — add one in User Management first.
                    </p>
                  )}
                </>
              )}
            </Field>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-espresso text-cream font-medium py-2.5 hover:bg-espresso/90 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      </div>
    </HrLayout>
  );
}
