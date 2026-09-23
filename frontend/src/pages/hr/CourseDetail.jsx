import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import ModuleItem from '../../components/ModuleItem';
import ModuleForm from '../../components/ModuleForm';
import LessonForm from '../../components/LessonForm';
import EnrollmentTable from '../../components/EnrollmentTable';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge, LoadingState, ErrorState, EmptyState, useConfirm } from '../../components/ui/Primitives';
import * as courseService from '../../services/courseService';
import CourseCompetenciesSection from '../../components/CourseCompetenciesSection';

export default function CourseDetail({ basePath = '/hr', Layout = HrLayout }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const [moduleModal, setModuleModal] = useState(null); // null | 'create' | module object
  const [lessonModal, setLessonModal] = useState(null); // null | { moduleId, lesson? }
  const [publishError, setPublishError] = useState(null);

  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => courseService.getCourse(id),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['course', id] });
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  }

  const createModuleMutation = useMutation({
    mutationFn: (data) => courseService.createModule(id, data),
    onSuccess: () => { invalidate(); setModuleModal(null); },
  });
  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, data }) => courseService.updateModule(moduleId, data),
    onSuccess: () => { invalidate(); setModuleModal(null); },
  });
  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId) => courseService.deleteModule(moduleId),
    onSuccess: invalidate,
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, data }) => courseService.createLesson(moduleId, data),
    onSuccess: () => { invalidate(); setLessonModal(null); },
  });
  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }) => courseService.updateLesson(lessonId, data),
    onSuccess: () => { invalidate(); setLessonModal(null); },
  });
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => courseService.deleteLesson(lessonId),
    onSuccess: invalidate,
  });

  const publishMutation = useMutation({
    mutationFn: () => courseService.publishCourse(id),
    onSuccess: invalidate,
    onError: (err) => {
      const data = err.response?.data;
      if (data?.error === 'COURSE_NOT_PUBLISHABLE') {
        setPublishError(data.details?.problems || []);
      }
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => courseService.archiveCourse(id),
    onSuccess: invalidate,
  });

  if (courseQuery.isLoading) {
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

  const course = courseQuery.data;

  async function handleDeleteModule(mod) {
    const ok = await confirm({
      title: `Delete "${mod.title}"?`,
      description: 'This removes the module and its lessons. This cannot be undone if no learner has started them.',
      danger: true,
      confirmLabel: 'Delete Module',
    });
    if (ok) deleteModuleMutation.mutate(mod.id);
  }

  async function handleDeleteLesson(lesson) {
    const ok = await confirm({
      title: `Delete "${lesson.title}"?`,
      description: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete Lesson',
    });
    if (ok) deleteLessonMutation.mutate(lesson.id);
  }

  async function handleArchive() {
    const ok = await confirm({
      title: 'Archive this course?',
      description: 'Existing learners will retain their learning history. It can no longer be assigned as new training.',
      danger: true,
      confirmLabel: 'Archive Course',
    });
    if (ok) archiveMutation.mutate();
  }

  return (
    <Layout>
      {dialog}
      <Link to={`${basePath}/courses`} className="text-sm text-gold hover:underline">
        ← Back to courses
      </Link>

      {/* Header */}
      <div className="mt-3 bg-white border border-border-warm rounded-2xl p-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-48 aspect-[16/9] md:aspect-square rounded-xl bg-cream flex items-center justify-center overflow-hidden shrink-0">
          {course.thumbnail ? (
            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-espresso/20 text-3xl font-semibold">{course.title.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-espresso">{course.title}</h1>
              <p className="text-sm text-espresso/60 mt-1">{course.description}</p>
            </div>
            <StatusBadge status={course.status} />
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
            <div>
              <dt className="text-espresso/40 text-xs">Category</dt>
              <dd className="text-espresso">{course.category}</dd>
            </div>
            <div>
              <dt className="text-espresso/40 text-xs">Difficulty</dt>
              <dd className="text-espresso">{course.difficulty}</dd>
            </div>
            <div>
              <dt className="text-espresso/40 text-xs">Duration</dt>
              <dd className="text-espresso">{course.duration ? `${course.duration} min` : '—'}</dd>
            </div>
            <div>
              <dt className="text-espresso/40 text-xs">Instructor</dt>
              <dd className="text-espresso">{course.instructor?.name || '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to={`${basePath}/courses/${id}/edit`}
              className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
            >
              Edit
            </Link>
            {course.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => { setPublishError(null); publishMutation.mutate(); }}
                disabled={publishMutation.isPending}
                className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish'}
              </button>
            )}
            {course.status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleArchive}
                className="px-4 py-2 rounded-xl border border-burgundy/30 text-sm font-medium text-burgundy hover:bg-burgundy/5 transition"
              >
                Archive
              </button>
            )}
          </div>

          {publishError && (
            <div className="mt-4 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3">
              <p className="font-medium">Course cannot be published yet.</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {publishError.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Course content builder */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-espresso">Course Content</h2>
          <button type="button" onClick={() => setModuleModal('create')} className="text-sm text-gold hover:underline font-medium">
            + Add Module
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {course.modules.length === 0 ? (
            <EmptyState title="No modules yet." description="Add your first module to start building this course." />
          ) : (
            course.modules.map((mod, index) => (
              <ModuleItem
                key={mod.id}
                module={mod}
                index={index}
                onEditModule={() => setModuleModal(mod)}
                onDeleteModule={() => handleDeleteModule(mod)}
                onAddLesson={() => setLessonModal({ moduleId: mod.id })}
                onEditLesson={(lesson) => setLessonModal({ moduleId: mod.id, lesson })}
                onDeleteLesson={handleDeleteLesson}
              />
            ))
          )}
        </div>
      </div>

      {/* Learners */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-espresso mb-4">Learners</h2>
        {course.learners.length === 0 ? (
          <EmptyState title="No learners enrolled yet." description="Assign this course as training from the Trainings page once it's published." />
        ) : (
          <EnrollmentTable rows={course.learners} />
        )}
      </div>

      {/* Course Competencies */}
      <CourseCompetenciesSection courseId={id} />

      {/* Modals */}
      <Modal open={moduleModal !== null} title={moduleModal === 'create' ? 'Add Module' : 'Edit Module'} onClose={() => setModuleModal(null)}>
        <ModuleForm
          initial={moduleModal !== 'create' ? moduleModal : undefined}
          submitLabel={moduleModal === 'create' ? 'Add Module' : 'Save Changes'}
          onCancel={() => setModuleModal(null)}
          onSubmit={(data) =>
            moduleModal === 'create'
              ? createModuleMutation.mutateAsync(data)
              : updateModuleMutation.mutateAsync({ moduleId: moduleModal.id, data })
          }
        />
      </Modal>

      <Modal open={lessonModal !== null} title={lessonModal?.lesson ? 'Edit Lesson' : 'Add Lesson'} onClose={() => setLessonModal(null)} wide>
        {lessonModal && (
          <LessonForm
            initial={lessonModal.lesson}
            submitLabel={lessonModal.lesson ? 'Save Changes' : 'Add Lesson'}
            onCancel={() => setLessonModal(null)}
            onSubmit={(data) =>
              lessonModal.lesson
                ? updateLessonMutation.mutateAsync({ lessonId: lessonModal.lesson.id, data })
                : createLessonMutation.mutateAsync({ moduleId: lessonModal.moduleId, data })
            }
          />
        )}
      </Modal>
    </Layout>
  );
}
