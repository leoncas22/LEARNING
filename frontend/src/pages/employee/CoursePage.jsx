import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import LessonContent from '../../components/LessonContent';
import { ProgressBar, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as learningService from '../../services/learningService';
import * as courseService from '../../services/courseService';

export default function CoursePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const query = useQuery({
    queryKey: ['my-course', id],
    queryFn: () => learningService.getMyCourse(id),
  });

  useEffect(() => {
    if (query.data && !selectedLessonId) {
      setSelectedLessonId(query.data.continueLessonId || query.data.modules[0]?.lessons[0]?.id || null);
    }
  }, [query.data, selectedLessonId]);

  const completeMutation = useMutation({
    mutationFn: (lessonId) => courseService.completeLesson(lessonId),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['my-course', id] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-learning-summary'] });
    },
    onError: (error) => setActionError(error.response?.data?.message || 'Unable to save lesson progress. Please try again.'),
  });

  if (query.isLoading) {
    return (
      <EmployeeLayout>
        <LoadingState label="Loading course..." />
      </EmployeeLayout>
    );
  }
  if (query.isError) {
    return (
      <EmployeeLayout>
        <ErrorState message="Unable to load this course." onRetry={query.refetch} />
      </EmployeeLayout>
    );
  }

  const { course, modules, moduleProgress = [], enrollment, courseCompleted } = query.data;
  const allLessons = modules.flatMap((m) => m.lessons);
  const moduleProgressById = new Map(moduleProgress.map((item) => [item.moduleId, item]));
  const selectedLesson = allLessons.find((l) => l.id === selectedLessonId) || null;
  const selectedIndex = allLessons.findIndex((l) => l.id === selectedLessonId);
  const prevLesson = selectedIndex > 0 ? allLessons[selectedIndex - 1] : null;
  const nextLesson = selectedIndex >= 0 && selectedIndex < allLessons.length - 1 ? allLessons[selectedIndex + 1] : null;

  function selectLesson(lessonId) {
    setSelectedLessonId(lessonId);
    setNavOpen(false);
  }

  async function handleMarkComplete() {
    try {
      await completeMutation.mutateAsync(selectedLessonId);
      if (nextLesson) setSelectedLessonId(nextLesson.id);
    } catch {
      // Mutation feedback stays on the page; keep the current lesson selected.
    }
  }

  return (
    <EmployeeLayout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-espresso">{course.title}</h1>
        <div className="mt-3 max-w-sm">
          <ProgressBar value={enrollment.progress} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setNavOpen((v) => !v)}
        className="md:hidden mb-4 w-full text-left px-4 py-2.5 rounded-xl border border-border-warm bg-white text-sm font-medium text-espresso"
      >
        {navOpen ? 'Hide' : 'Show'} course content
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Course content nav — collapsible on mobile per spec */}
        <aside className={`md:w-72 shrink-0 ${navOpen ? 'block' : 'hidden'} md:block`}>
          <nav className="bg-white border border-border-warm rounded-2xl overflow-hidden" aria-label="Course content">
            {modules.map((mod) => {
              const progress = moduleProgressById.get(mod.id);
              return (
              <div key={mod.id} className="border-b border-border-warm last:border-b-0">
                <div className="px-4 py-2.5 bg-cream/40">
                  <p className="text-xs font-semibold text-espresso/50 uppercase tracking-wide">{mod.title}</p>
                  <p className="text-[11px] text-espresso/40 mt-1">{progress?.completedLessons || 0} of {progress?.totalLessons || mod.lessons.length} lessons · {progress?.progress || 0}%</p>
                </div>
                <ul>
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => selectLesson(lesson.id)}
                        aria-current={lesson.id === selectedLessonId ? 'true' : undefined}
                        className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                          lesson.id === selectedLessonId ? 'bg-gold/10 text-espresso font-medium' : 'text-espresso/70 hover:bg-cream/60'
                        }`}
                      >
                        <span aria-hidden="true">{lesson.completed ? '✓' : '○'}</span>
                        <span className="truncate">{lesson.title}</span>
                        <span className="text-[10px] text-espresso/40 uppercase">{lesson.type === 'LINK' ? 'Resource' : lesson.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              );
            })}
          </nav>
        </aside>

        {/* Lesson content */}
        <div className="flex-1 min-w-0 bg-white border border-border-warm rounded-2xl p-6">
          {actionError && <p className="mb-4 rounded-xl border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy" role="alert">{actionError}</p>}
          {courseCompleted ? (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-espresso">Course Completed 🎉</p>
              <p className="text-sm text-espresso/60 mt-1">You&apos;ve finished every lesson in this course.</p>
            </div>
          ) : selectedLesson ? (
            <>
              <h2 className="text-lg font-semibold text-espresso mb-4">{selectedLesson.title}</h2>
              <LessonContent lesson={selectedLesson} />

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-warm">
                <button
                  type="button"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && selectLesson(prevLesson.id)}
                  className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream transition"
                >
                  ← Previous
                </button>

                {selectedLesson.completed ? (
                  <span className="text-sm text-espresso/50">✓ Completed</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleMarkComplete}
                    disabled={completeMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
                  >
                    {completeMutation.isPending ? 'Saving...' : 'Mark Complete'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && selectLesson(nextLesson.id)}
                  className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream transition"
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-espresso/50">This course has no lessons yet.</p>
          )}
        </div>
      </div>
    </EmployeeLayout>
  );
}
