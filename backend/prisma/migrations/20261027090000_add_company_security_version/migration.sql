-- Add a dedicated company authorization epoch for invalidating tenant access JWTs.
ALTER TABLE "companies" ADD COLUMN "securityVersion" INTEGER NOT NULL DEFAULT 0;
