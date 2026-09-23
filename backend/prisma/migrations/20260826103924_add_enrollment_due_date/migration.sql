-- ============================================================================
-- Migration: add_enrollment_due_date
-- Adds the training-deadline field needed by Phase 4's assignment flow.
-- Everything else Phase 4 needs (Course, Module, Lesson, Enrollment,
-- LessonProgress, Notification.TRAINING_ASSIGNED) already exists from
-- Phase 2 — see docs/phase-4.md for the inspection that confirmed this.
-- ============================================================================

ALTER TABLE "enrollments" ADD COLUMN "dueDate" TIMESTAMP(3);
