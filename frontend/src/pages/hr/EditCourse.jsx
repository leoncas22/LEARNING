import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import { LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as courseService from '../../services/courseService';
import * as employeeService from '../../services/employeeService';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-burgundy">{error}</p>}
    </div>
  );
}

export default function EditCourse({ basePath = '/hr', Layout = HrLayout, instructorMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courseQuery = useQuery({ queryKey: ['course', id], queryFn: () => courseService.getCourse(id) });
  const instructorsQuery = useQuery({ queryKey: ['employees'], queryFn: () => employeeService.listEmployees(), enabled: !instructorMode });
  const instructors = (instructorsQuery.data || []).filter((e) => e.role?.name === 'INSTRUCTOR');

  useEffect(() => {
    if (courseQuery.data && !form) {
      const c = courseQuery.data;
      setForm({
        title: c.title,
        description: c.description || '',
        thumbnail: c.thumbnail || '',
        category: c.category || '',
        difficulty: c.difficulty,
        duration: c.duration || '',
        instructorId: c.instructor?.id || '',
      });
    }
  }, [courseQuery.data, form]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload = { ...form, duration: form.duration ? Number(form.duration) : undefined, thumbnail: form.thumbnail || undefined };
      if (instructorMode) delete payload.instructorId;
      await courseService.updateCourse(id, payload);
      navigate(`${basePath}/courses/${id}`, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) setFieldErrors(data.details);
      else setError(data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (courseQuery.isLoading || !form) {
    return (
      <Layout>
        <LoadingState label="Loading course..." />
      </Layout>
    );
  }
  if (courseQuery.isError) {
    return (
      <Layout>
        <ErrorState message="Unable to load this course." onRetry={courseQuery.refetch} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <Link to={`${basePath}/courses/${id}`} className="text-sm text-gold hover:underline">
          ← Back to course
        </Link>
        <h1 className="text-2xl font-semibold text-espresso mt-3">Edit Course</h1>

        {error && <div className="mt-6 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 bg-white border border-border-warm rounded-2xl p-6 space-y-5">
          <Field label="Course Title" error={fieldErrors.title}>
            <input required value={form.title} onChange={update('title')} className={inputClass} />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <textarea required rows={4} value={form.description} onChange={update('description')} className={inputClass} />
          </Field>
          <Field label="Thumbnail URL" error={fieldErrors.thumbnail}>
            <input value={form.thumbnail} onChange={update('thumbnail')} className={inputClass} placeholder="https://..." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" error={fieldErrors.category}>
              <input required value={form.category} onChange={update('category')} className={inputClass} />
            </Field>
            <Field label="Difficulty" error={fieldErrors.difficulty}>
              <select required value={form.difficulty} onChange={update('difficulty')} className={inputClass}>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </Field>
          </div>
          <div className={`grid ${instructorMode ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <Field label="Estimated Duration (minutes)" error={fieldErrors.duration}>
              <input type="number" min="1" value={form.duration} onChange={update('duration')} className={inputClass} />
            </Field>
            {!instructorMode && (
              <Field label="Instructor" error={fieldErrors.instructorId}>
                <select required value={form.instructorId} onChange={update('instructorId')} className={inputClass}>
                  <option value="">Select instructor</option>
                  {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-espresso text-cream font-medium py-2.5 hover:bg-espresso/90 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
