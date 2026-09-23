-- Phase 6: Certification & Competency Management
-- This migration:
--   1. Adds Phase 6 enum types
--   2. Truncates the legacy `certificates` table (Phase 2 stub data, no production significance)
--   3. Drops legacy columns and adds new Phase 6 columns to `certificates`
--   4. Creates new Phase 6 tables

-- ─── Step 1: Add new enum types ────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationStatus') THEN
    CREATE TYPE "CertificationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificateStatus') THEN
    CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompetencyStatus') THEN
    CREATE TYPE "CompetencyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END $$;

-- Add new notification type values (Postgres ALTER TYPE ADD VALUE is safe)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_REVOKED';

-- ─── Step 2: Create Certification tables ───────────────────────────────────

CREATE TABLE "certifications" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"    TEXT NOT NULL,
  "courseId"     TEXT,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "validityDays" INTEGER,
  "status"       "CertificationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "certifications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "certifications_companyId_idx" ON "certifications"("companyId");
CREATE INDEX "certifications_status_idx" ON "certifications"("status");

CREATE TABLE "certification_requirements" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "certificationId" TEXT NOT NULL,
  "minProgressPct"  INTEGER,
  "quizId"          TEXT,
  "minQuizScore"    INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certification_requirements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certification_requirements_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "certification_requirements_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ─── Step 3: Replace legacy certificates table ─────────────────────────────

-- Truncate Phase 2 stub data (development data only, safe to clear)
TRUNCATE TABLE "certificates" CASCADE;

-- Drop legacy columns that are no longer part of Phase 6 Certificate model
ALTER TABLE "certificates" DROP COLUMN IF EXISTS "courseId";
ALTER TABLE "certificates" DROP COLUMN IF EXISTS "score";
ALTER TABLE "certificates" DROP COLUMN IF EXISTS "certificateUrl";

-- Add new Phase 6 columns
ALTER TABLE "certificates"
  ADD COLUMN "certificationId" TEXT NOT NULL,
  ADD COLUMN "companyId"       TEXT NOT NULL,
  ADD COLUMN "verificationCode" TEXT NOT NULL,
  ADD COLUMN "status"          "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "revocationNote"  TEXT,
  ADD COLUMN "revokedAt"       TIMESTAMP(3),
  ADD COLUMN "quizScore"       INTEGER,
  ADD COLUMN "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing unique constraint if needed and add new ones
DROP INDEX IF EXISTS "certificates_certificateNumber_key";
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_certificateNumber_key" UNIQUE ("certificateNumber");
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_verificationCode_key" UNIQUE ("verificationCode");

-- Add FKs
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "certificates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add new indexes
CREATE INDEX "certificates_companyId_idx" ON "certificates"("companyId");
CREATE INDEX "certificates_certificationId_idx" ON "certificates"("certificationId");
CREATE INDEX "certificates_status_idx" ON "certificates"("status");
CREATE INDEX "certificates_verificationCode_idx" ON "certificates"("verificationCode");

-- ─── Step 4: Create Competency tables ─────────────────────────────────────

CREATE TABLE "competencies" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "category"    TEXT,
  "status"      "CompetencyStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "competencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "competencies_companyId_name_key" UNIQUE ("companyId", "name"),
  CONSTRAINT "competencies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "competencies_companyId_idx" ON "competencies"("companyId");
CREATE INDEX "competencies_status_idx" ON "competencies"("status");

CREATE TABLE "competency_level_configs" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "competencyId" TEXT NOT NULL,
  "level"        TEXT NOT NULL,
  "description"  TEXT,
  "minScore"     INTEGER NOT NULL,
  "maxScore"     INTEGER NOT NULL,
  CONSTRAINT "competency_level_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "competency_level_configs_competencyId_level_key" UNIQUE ("competencyId", "level"),
  CONSTRAINT "competency_level_configs_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "competency_level_configs_competencyId_idx" ON "competency_level_configs"("competencyId");

-- ─── Step 5: Create CourseCompetency table ─────────────────────────────────

CREATE TABLE "course_competencies" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId"     TEXT NOT NULL,
  "competencyId" TEXT NOT NULL,
  "targetLevel"  TEXT NOT NULL,
  "weight"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_competencies_courseId_competencyId_key" UNIQUE ("courseId", "competencyId"),
  CONSTRAINT "course_competencies_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "course_competencies_courseId_idx" ON "course_competencies"("courseId");
CREATE INDEX "course_competencies_competencyId_idx" ON "course_competencies"("competencyId");

-- ─── Step 6: Create EmployeeCompetency table ────────────────────────────────

CREATE TABLE "employee_competencies" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"       TEXT NOT NULL,
  "competencyId" TEXT NOT NULL,
  "level"        TEXT NOT NULL,
  "score"        INTEGER NOT NULL,
  "achievedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source"       TEXT NOT NULL DEFAULT 'COURSE',
  "sourceId"     TEXT,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_competencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_competencies_userId_competencyId_key" UNIQUE ("userId", "competencyId"),
  CONSTRAINT "employee_competencies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "employee_competencies_userId_idx" ON "employee_competencies"("userId");
CREATE INDEX "employee_competencies_competencyId_idx" ON "employee_competencies"("competencyId");

