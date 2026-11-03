import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import QuizTimer from "../../components/QuizTimer";
import QuestionNavigator from "../../components/QuestionNavigator";
import QuestionRenderer from "../../components/QuestionRenderer";
import { Modal } from "../../components/ui/Modal";
import { LoadingState, ErrorState } from "../../components/ui/Primitives";
import * as attemptService from "../../services/quizAttemptService";

function countAnswered(questions) {
  return questions.filter((q) => {
    if (!q.myAnswer) return false;
    if (q.type === "SHORT_ANSWER")
      return Boolean(q.myAnswer.answerText?.trim());
    return (q.myAnswer.selectedOptionIds || []).length > 0;
  }).length;
}

export default function QuizTakingPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState(""); // '' | 'saving' | 'saved'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimeoutRef = useRef(null);
  const pendingSavesRef = useRef(new Map());
  const inFlightSaveRef = useRef(null);
  const saveErrorRef = useRef(null);
  const latestAttemptRef = useRef(null);

  const startQuery = useQuery({
    queryKey: ["quiz-attempt-start", quizId],
    queryFn: () => attemptService.startAttempt(quizId),
    retry: false,
  });

  useEffect(() => {
    if (startQuery.data) setAttempt(startQuery.data);
  }, [startQuery.data]);

  useEffect(() => {
    latestAttemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  const submitMutation = useMutation({
    mutationFn: () => attemptService.submitAttempt(attempt.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["my-quiz-history"] });
      navigate(`/employee/quizzes/${result.attemptId}/result`, {
        replace: true,
      });
    },
    onError: (err) => {
      setError(
        err.response?.data?.message || "Unable to submit. Please try again.",
      );
      setSubmitting(false);
    },
  });

  const updateAnswerLocally = useCallback((questionId, value) => {
    setAttempt((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, myAnswer: value } : q,
      ),
    }));
  }, []);

  function handleAnswerChange(questionId, value) {
    if (submitting) return;
    updateAnswerLocally(questionId, value);
    pendingSavesRef.current.set(questionId, value);
    saveErrorRef.current = null;
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      flushPendingSave().catch(() => {});
    }, 600);
  }

  async function flushPendingSave() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (inFlightSaveRef.current) {
      try {
        await inFlightSaveRef.current;
      } catch (requestError) {
        const saveError = saveErrorRef.current || requestError;
        saveErrorRef.current = null;
        setSaveStatus("error");
        setError(saveError.response?.data?.message || "Unable to save your answer. Please try again.");
        throw saveError;
      }
      if (saveErrorRef.current) {
        const saveError = saveErrorRef.current;
        saveErrorRef.current = null;
        setSaveStatus("error");
        setError(saveError.response?.data?.message || "Unable to save your answer. Please try again.");
        throw saveError;
      }
      if (pendingSavesRef.current.size === 0) return;
      return flushPendingSave();
    }
    if (pendingSavesRef.current.size === 0) return;
    const activeAttempt = latestAttemptRef.current;
    if (!activeAttempt) {
      const unavailable = new Error("Attempt is not available");
      setError("Your quiz attempt is still loading. Please try submitting again.");
      throw unavailable;
    }

    setSaveStatus("saving");
    const saveBatch = async () => {
      while (pendingSavesRef.current.size > 0) {
        const batch = [...pendingSavesRef.current.entries()];
        const results = await Promise.allSettled(batch.map(async ([questionId, answer]) => {
          await attemptService.saveAnswer(activeAttempt.id, questionId, answer || {});
          if (pendingSavesRef.current.get(questionId) === answer) {
            pendingSavesRef.current.delete(questionId);
          }
        }));
        const rejected = results.find((result) => result.status === "rejected");
        if (rejected) {
          saveErrorRef.current = rejected.reason;
          pendingSavesRef.current.clear();
          throw rejected.reason;
        }
      }
    };
    const inFlight = saveBatch();
    inFlightSaveRef.current = inFlight;
    try {
      await inFlight;
      if (saveErrorRef.current) {
        const saveError = saveErrorRef.current;
        saveErrorRef.current = null;
        setSaveStatus("error");
        setError(saveError.response?.data?.message || "Unable to save your answer. Please try again.");
        throw saveError;
      }
      setError("");
      setSaveStatus("saved");
    } catch (saveError) {
      setSaveStatus("error");
      setError(saveError.response?.data?.message || "Unable to save your answer. Please try again.");
      throw saveError;
    } finally {
      if (inFlightSaveRef.current === inFlight) inFlightSaveRef.current = null;
    }
  }

  async function handleExpire() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await flushPendingSave();
      submitMutation.mutate();
    } catch {
      setSubmitting(false);
    }
  }

  function handleSubmitClick() {
    if (!submitting) setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    if (submitting) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      await flushPendingSave();
      submitMutation.mutate();
    } catch {
      setSubmitting(false);
    }
  }

  if (startQuery.isLoading) {
    return (
      <EmployeeLayout>
        <LoadingState label="Preparing your quiz..." />
      </EmployeeLayout>
    );
  }
  if (startQuery.isError) {
    const message =
      startQuery.error?.response?.data?.message || "Unable to load this quiz.";
    return (
      <EmployeeLayout>
        <ErrorState message={message} onRetry={startQuery.refetch} />
      </EmployeeLayout>
    );
  }

  if (!attempt) {
    return (
      <EmployeeLayout>
        <ErrorState message="The quiz attempt could not be prepared. Please try again." onRetry={startQuery.refetch} />
      </EmployeeLayout>
    );
  }

  if (attempt.status !== "IN_PROGRESS") {
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
          <h1 className="text-lg font-semibold text-espresso">
            {attempt.quiz.title}
          </h1>
          <p className="text-sm text-espresso/50">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <QuizTimer deadline={attempt.deadline} onExpire={handleExpire} />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-3" role="alert">
          {error}
        </div>
      )}

      {attempt.quiz.instructions && (
        <div className="mb-4 rounded-xl border border-border-warm bg-cream/40 px-4 py-3 text-sm text-espresso/70">
          {attempt.quiz.instructions}
        </div>
      )}

      <div className="bg-white border border-border-warm rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-espresso/40">
            {currentQuestion.points} points
          </p>
          <span className="text-xs text-espresso/40 h-4" role="status" aria-live="polite">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Not saved"}
          </span>
        </div>
        <p className="text-base text-espresso font-medium mb-5">
          {currentQuestion.question}
        </p>

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
              disabled={submitting}
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
        <QuestionNavigator
          questions={questions}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />
      </div>

      {currentIndex < questions.length - 1 && (
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={submitting}
            className="text-sm text-gold hover:underline font-medium"
          >
            Submit Quiz
          </button>
        </div>
      )}

      <Modal
        open={confirmOpen}
        title="Submit your quiz?"
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
      >
        <p className="text-sm text-espresso/70">
          You have answered {answeredCount} of {questions.length} questions.
        </p>
        {unansweredCount > 0 && (
          <p className="text-sm text-burgundy mt-2">
            You still have {unansweredCount} unanswered question
            {unansweredCount > 1 ? "s" : ""}.
          </p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
          >
            Continue Quiz
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      </Modal>
    </EmployeeLayout>
  );
}
