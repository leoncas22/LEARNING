import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import QuizTimer from '../../components/QuizTimer';
import QuestionNavigator from '../../components/QuestionNavigator';
import QuestionRenderer from '../../components/QuestionRenderer';
import { Modal } from '../../components/ui/Modal';
import { LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as attemptService from '../../services/quizAttemptService';

function countAnswered(questions) {
  return questions.filter((q) => {
    if (!q.myAnswer) return false;
    if (q.type === 'SHORT_ANSWER') return Boolean(q.myAnswer.answerText?.trim());
    return (q.myAnswer.selectedOptionIds || []).length > 0;
  }).length;
}

export default function QuizTakingPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimeoutRef = useRef(null);

  const startQuery = useQuery({
    queryKey: ['quiz-attempt-start', quizId],
    queryFn: () => attemptService.startAttempt(quizId),
    retry: false,
  });

  useEffect(() => {
    if (startQuery.data) setAttempt(startQuery.data);
  }, [startQuery.data]);

  const submitMutation = useMutation({
    mutationFn: () => attemptService.submitAttempt(attempt.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['my-quiz-history'] });
      navigate(`/employee/quizzes/${result.attemptId}/result`, { replace: true });
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Unable to submit. Please try again.');
      setSubmitting(false);
    },
  });

  const updateAnswerLocally = useCallback((questionId, value) => {
    setAttempt((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, myAnswer: value } : q)),
    }));
  }, []);

  function handleAnswerChange(questionId, value) {
    updateAnswerLocally(questionId, value);
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await attemptService.saveAnswer(attempt.id, questionId, value);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('');
      }
    }, 600);
  }

  function handleExpire() {
    if (!submitting) {
      setSubmitting(true);
      submitMutation.mutate();
    }
  }

  function handleSubmitClick() {
    setConfirmOpen(true);
  }

  function handleConfirmSubmit() {
    setConfirmOpen(false);
    setSubmitting(true);
    submitMutation.mutate();
  }

  if (startQuery.isLoading || !attempt) {
    return (
      <EmployeeLayout>
        <LoadingState label="Preparing your quiz..." />
      </EmployeeLayout>
    );
  }
  if (startQuery.isError) {
    const message = startQuery.error?.response?.data?.message || 'Unable to load this quiz.';
    return (
      <EmployeeLayout>
        <ErrorState message={message} onRetry={startQuery.refetch} />
      </EmployeeLayout>
    );
  }

  if (attempt.status !== 'IN_PROGRESS') {
    // The attempt got finalized (e.g. expired) while we were loading —
    // send the learner straight to their result rather than a dead page.
    navigate(`/employee/quizzes/${attempt.id}/result`, { replace: true });
    return null;
  }

  const questions = attempt.questions;
  const currentQuestion = questions[currentIndex];
  const answeredCount = countAnswered(questions);
  const unansweredCount = questions.length - answeredCount;

  return (
    <EmployeeLayout>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold text-espresso">{attempt.quiz.title}</h1>
          <p className="text-sm text-espresso/50">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <QuizTimer deadline={attempt.deadline} onExpire={handleExpire} />
      </div>

      {error && <div className="mb-4 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3">{error}</div>}

      {attempt.quiz.instructions && (
        <div className="mb-4 rounded-xl border border-border-warm bg-cream/40 px-4 py-3 text-sm text-espresso/70">
          {attempt.quiz.instructions}
        </div>
      )}

      <div className="bg-white border border-border-warm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-espresso/40">{currentQuestion.points} points</p>
          <span className="text-xs text-espresso/40 h-4">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
          </span>
        </div>
        <p className="text-base text-espresso font-medium mb-5">{currentQuestion.question}</p>

        <QuestionRenderer
          question={currentQuestion}
          value={currentQuestion.myAnswer}
          onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
        />

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-warm">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream transition"
          >
            Previous
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <QuestionNavigator questions={questions} currentIndex={currentIndex} onSelect={setCurrentIndex} />
      </div>

      {currentIndex < questions.length - 1 && (
        <div className="text-center mt-6">
          <button type="button" onClick={handleSubmitClick} disabled={submitting} className="text-sm text-gold hover:underline font-medium">
            Submit Quiz
          </button>
        </div>
      )}

      <Modal open={confirmOpen} title="Submit your quiz?" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-espresso/70">
          You have answered {answeredCount} of {questions.length} questions.
        </p>
        {unansweredCount > 0 && (
          <p className="text-sm text-burgundy mt-2">
            You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
          </p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
          >
            Continue Quiz
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
          >
            Submit Quiz
          </button>
        </div>
      </Modal>
    </EmployeeLayout>
  );
}
