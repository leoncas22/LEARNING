-- Phase 10: extend the learning-path structures created by the initial schema.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEARNING_PATH_ASSIGNED';
ALTER TABLE "learning_paths" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "learning_paths" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "learning_path_courses" ADD COLUMN IF NOT EXISTS "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "learning_paths_status_idx" ON "learning_paths"("status");
CREATE TABLE "learning_path_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "learningPathId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedById" TEXT,
  "dueDate" TIMESTAMP(3),
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_path_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_path_assignments_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "learning_path_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "learning_path_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "learning_path_assignments_learningPathId_userId_key" ON "learning_path_assignments"("learningPathId", "userId");
CREATE INDEX "learning_path_assignments_learningPathId_idx" ON "learning_path_assignments"("learningPathId");
CREATE INDEX "learning_path_assignments_userId_idx" ON "learning_path_assignments"("userId");
