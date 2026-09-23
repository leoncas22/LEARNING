-- ============================================================================
-- Migration: add_quiz_engine
-- Extends the Quiz/Question/QuizAttempt models already introduced in
-- Phase 2 with the configuration, security, and lifecycle fields Phase 5
-- needs. Every change here is additive (new nullable/defaulted columns,
-- new enum values) — nothing existing is renamed, dropped, or made
-- destructive. See docs/phase-5.md for the full rationale.
-- ============================================================================

-- New question type: SHORT_ANSWER (auto-graded via normalized comparison).
-- ESSAY remains reserved, unused in the Phase 5 UI, for future manual grading.
ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';

-- New attempt lifecycle states. PASSED/FAILED are kept in the enum type
-- (Postgres cannot drop enum values in place) but the application no
-- longer writes them — pass/fail now lives in quiz_attempts.passed,
-- decoupled from the process-state enum.
ALTER TYPE "QuizAttemptStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "QuizAttemptStatus" ADD VALUE 'GRADED';
ALTER TYPE "QuizAttemptStatus" ADD VALUE 'EXPIRED';

-- ---------- Question extensions ----------
ALTER TABLE "questions" ADD COLUMN "explanation" TEXT;
ALTER TABLE "questions" ADD COLUMN "acceptedAnswers" JSONB;
-- Note: "createdAt"/"updatedAt" already existed on "questions" since the
-- Phase 2 migration (schema.prisma just hadn't declared them — fixed here).

-- ---------- Quiz extensions ----------
ALTER TABLE "quizzes" ADD COLUMN "lessonId" TEXT;
ALTER TABLE "quizzes" ADD COLUMN "instructions" TEXT;
ALTER TABLE "quizzes" ADD COLUMN "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quizzes" ADD COLUMN "shuffleOptions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quizzes" ADD COLUMN "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quizzes" ADD COLUMN "createdById" TEXT;

ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quizzes_lessonId_idx" ON "quizzes"("lessonId");
CREATE INDEX "quizzes_status_idx" ON "quizzes"("status");

-- ---------- QuizAttempt extensions ----------
ALTER TABLE "quiz_attempts" ADD COLUMN "passed" BOOLEAN;
ALTER TABLE "quiz_attempts" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "quiz_attempts" ADD COLUMN "questionOrder" JSONB;
ALTER TABLE "quiz_attempts" ADD COLUMN "optionOrder" JSONB;

CREATE INDEX "quiz_attempts_status_idx" ON "quiz_attempts"("status");

