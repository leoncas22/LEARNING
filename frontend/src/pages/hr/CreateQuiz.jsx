import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import * as quizService from '../../services/quizService';
import * as courseService from '../../services/courseService';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-espresso/50">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-burgundy">{error}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-warm bg-white cursor-pointer">
      <span className="text-sm text-espresso">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-gold" />
    </label>
  );
}

const initialForm = {
  courseId: '',
  lessonId: '',
  title: '',
  description: '',
  instructions: '',
  timeLimit: '',
  passingScore: 80,
  attemptLimit: 1,
  shuffleQuestions: false,
  shuffleOptions: false,
  showCorrectAnswers: false,
};

export default function CreateQuiz({ basePath = '/hr', Layout = HrLayout }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coursesQuery = useQuery({ queryKey: ['courses', { forQuiz: true }], queryFn: () => courseService.listCourses({ limit: 100 }) });
  const courseDetailQuery = useQuery({
    queryKey: ['course', form.courseId],
    queryFn: () => courseService.getCourse(form.courseId),
    enabled: Boolean(form.courseId),
  });
  const lessons = courseDetailQuery.data?.modules?.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) || [];

  function update(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        lessonId: form.lessonId || undefined,
        timeLimit: form.timeLimit ? Number(form.timeLimit) : undefined,
        passingScore: Number(form.passingScore),
        attemptLimit: Number(form.attemptLimit),
      };
      const quiz = await quizService.createQuiz(payload);
      navigate(`${basePath}/quizzes/${quiz.id}`, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) setFieldErrors(data.details);
      else setError(data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <Link to={`${basePath}/quizzes`} className="text-sm text-gold hover:underline">
          ← Back to quizzes
        </Link>
        <h1 className="text-2xl font-semibold text-espresso mt-3">Create Quiz</h1>
        <p className="text-sm text-espresso/60 mt-1">New quizzes start as a draft — add questions, then publish.</p>

        {error && <div className="mt-6 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 bg-white border border-border-warm rounded-2xl p-6 space-y-5">
          <Field label="Course" error={fieldErrors.courseId}>
            <select required value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value, lessonId: '' }))} className={inputClass}>
              <option value="">Select a course</option>
              {(coursesQuery.data?.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>

          {form.courseId && (
            <Field label="Lesson (optional)" hint="Attach this quiz to a specific lesson, or leave blank for a course-level quiz.">
              <select value={form.lessonId} onChange={update('lessonId')} className={inputClass}>
                <option value="">No specific lesson</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.moduleTitle} — {l.title}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Quiz Title" error={fieldErrors.title}>
            <input required value={form.title} onChange={update('title')} className={inputClass} />
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <textarea rows={3} value={form.description} onChange={update('description')} className={inputClass} />
          </Field>
          <Field label="Instructions" hint="Shown to the learner before they start.">
            <textarea rows={3} value={form.instructions} onChange={update('instructions')} className={inputClass} />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Time Limit (min)" hint="Leave blank for untimed">
              <input type="number" min="1" value={form.timeLimit} onChange={update('timeLimit')} className={inputClass} />
            </Field>
            <Field label="Passing Score (%)" error={fieldErrors.passingScore}>
              <input type="number" min="0" max="100" required value={form.passingScore} onChange={update('passingScore')} className={inputClass} />
            </Field>
            <Field label="Max Attempts" error={fieldErrors.attemptLimit}>
              <input type="number" min="1" required value={form.attemptLimit} onChange={update('attemptLimit')} className={inputClass} />
            </Field>
          </div>

          <div className="space-y-2">
            <Toggle label="Shuffle Questions" checked={form.shuffleQuestions} onChange={(v) => setForm((p) => ({ ...p, shuffleQuestions: v }))} />
            <Toggle label="Shuffle Options" checked={form.shuffleOptions} onChange={(v) => setForm((p) => ({ ...p, shuffleOptions: v }))} />
            <Toggle label="Show Correct Answers After Submission" checked={form.showCorrectAnswers} onChange={(v) => setForm((p) => ({ ...p, showCorrectAnswers: v }))} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-espresso text-cream font-medium py-2.5 hover:bg-espresso/90 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Quiz'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
