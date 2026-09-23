import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import QuestionCard from '../../components/QuestionCard';
import QuestionEditor from '../../components/QuestionEditor';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge, LoadingState, ErrorState, EmptyState, useConfirm } from '../../components/ui/Primitives';
import * as quizService from '../../services/quizService';

export default function QuizDetail({ basePath = '/hr', Layout = HrLayout }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const [questionModal, setQuestionModal] = useState(null); // null | 'create' | question object
  const [publishError, setPublishError] = useState(null);

  const quizQuery = useQuery({ queryKey: ['quiz', id], queryFn: () => quizService.getQuiz(id) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['quiz', id] });
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  }

  const createQuestionMutation = useMutation({
    mutationFn: (data) => quizService.createQuestion(id, data),
    onSuccess: () => { invalidate(); setQuestionModal(null); },
  });
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, data }) => quizService.updateQuestion(questionId, data),
    onSuccess: () => { invalidate(); setQuestionModal(null); },
  });
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId) => quizService.deleteQuestion(questionId),
    onSuccess: invalidate,
  });
  const publishMutation = useMutation({
    mutationFn: () => quizService.publishQuiz(id),
    onSuccess: invalidate,
    onError: (err) => {
      const data = err.response?.data;
      if (data?.error === 'QUIZ_NOT_PUBLISHABLE') setPublishError(data.details?.problems || []);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => quizService.archiveQuiz(id),
    onSuccess: invalidate,
  });

  if (quizQuery.isLoading) {
    return (
      <Layout>
        <LoadingState label="Loading quiz..." />
      </Layout>
    );
  }
  if (quizQuery.isError) {
    return (
      <Layout>
        <ErrorState message="Unable to load this quiz." onRetry={quizQuery.refetch} />
      </Layout>
    );
  }

  const quiz = quizQuery.data;

  async function handleDeleteQuestion(question) {
    const ok = await confirm({
      title: 'Delete this question?',
      description: 'This cannot be undone if no employee has answered it yet.',
      danger: true,
      confirmLabel: 'Delete Question',
    });
    if (ok) deleteQuestionMutation.mutate(question.id);
  }

  async function handleArchive() {
    const ok = await confirm({
      title: 'Archive this quiz?',
      description: 'It can no longer be started as a new attempt. Existing attempt history is kept.',
      danger: true,
      confirmLabel: 'Archive Quiz',
    });
    if (ok) archiveMutation.mutate();
  }

  function handleDuplicate(question) {
    setQuestionModal({
      ...question,
      id: undefined,
      question: `${question.question} (copy)`,
    });
  }

  return (
    <HrLayout>
      {dialog}
      <Link to={`${basePath}/quizzes`} className="text-sm text-gold hover:underline">
        ← Back to quizzes
      </Link>

      <div className="mt-3 bg-white border border-border-warm rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-espresso">{quiz.title}</h1>
            <p className="text-sm text-espresso/60 mt-1">{quiz.description}</p>
            <p className="text-xs text-espresso/40 mt-2">
              {quiz.course?.title}
              {quiz.lesson ? ` · ${quiz.lesson.title}` : ''}
            </p>
          </div>
          <StatusBadge status={quiz.status} />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
          <div>
            <dt className="text-espresso/40 text-xs">Time Limit</dt>
            <dd className="text-espresso">{quiz.timeLimit ? `${quiz.timeLimit} min` : 'Untimed'}</dd>
          </div>
          <div>
            <dt className="text-espresso/40 text-xs">Passing Score</dt>
            <dd className="text-espresso">{quiz.passingScore}%</dd>
          </div>
          <div>
            <dt className="text-espresso/40 text-xs">Max Attempts</dt>
            <dd className="text-espresso">{quiz.attemptLimit}</dd>
          </div>
          <div>
            <dt className="text-espresso/40 text-xs">Attempts so far</dt>
            <dd className="text-espresso">{quiz.attemptCount}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            to={`${basePath}/quizzes/${id}/results`}
            className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
          >
            View Results
          </Link>
          {quiz.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => { setPublishError(null); publishMutation.mutate(); }}
              disabled={publishMutation.isPending}
              className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {quiz.status !== 'ARCHIVED' && (
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
            <p className="font-medium">Quiz cannot be published yet.</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {publishError.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-espresso">Questions</h2>
          <button type="button" onClick={() => setQuestionModal('create')} className="text-sm text-gold hover:underline font-medium">
            + Add Question
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {quiz.questions.length === 0 ? (
            <EmptyState title="No questions yet." description="Add your first question to start building this quiz." />
          ) : (
            quiz.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                onEdit={() => setQuestionModal(question)}
                onDelete={() => handleDeleteQuestion(question)}
                onDuplicate={() => handleDuplicate(question)}
              />
            ))
          )}
        </div>
      </div>

      <Modal open={questionModal !== null} title={questionModal === 'create' || !questionModal?.id ? 'Add Question' : 'Edit Question'} onClose={() => setQuestionModal(null)} wide>
        {questionModal && (
          <QuestionEditor
            initial={questionModal === 'create' ? undefined : questionModal}
            submitLabel={questionModal === 'create' || !questionModal?.id ? 'Add Question' : 'Save Changes'}
            onCancel={() => setQuestionModal(null)}
            onSubmit={(data) =>
              questionModal === 'create' || !questionModal?.id
                ? createQuestionMutation.mutateAsync(data)
                : updateQuestionMutation.mutateAsync({ questionId: questionModal.id, data })
            }
          />
        )}
      </Modal>
    </HrLayout>
  );
}
