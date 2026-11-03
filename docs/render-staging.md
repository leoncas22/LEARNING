# Render staging setup
This repository includes a candidate Render Blueprint (`render.yaml`) for a Node/Express web service, PostgreSQL database, and React/Vite Static Site. This file prepares configuration only; it does not create resources or deploy the application. Confirm current resource availability, database plan eligibility and pricing, and Singapore region support in Render Dashboard before applying it. Use only synthetic, disposable staging data; never put production or real employee data in this stack. Existing legacy Free PostgreSQL databases expire after 30 days and have no backups; confirm current Free database eligibility in the Dashboard before resource creation.

## Before creating resources
1. Review every setting in `render.yaml`, including the generated JWT secrets. Render's `generateValue` creates independent secret values per environment; never copy a local or production secret into staging.
2. Create the web service and database only in an explicitly named staging Render workspace/project. Confirm database name `lms_staging`, that the requested PostgreSQL `free` plan is eligible for a new database in the account, and Singapore region support in Render Dashboard. If unavailable, stop and get approval for a currently offered plan before changing the Blueprint. Create the Static Site after confirming its configuration; static sites are global CDN resources and have no region/compute-plan fields.
3. After Render assigns the actual backend and frontend URLs, set `APP_URL` to the backend HTTPS origin and `CLIENT_URL` to the exact frontend origin. Replace the obvious `REPLACE_WITH_ACTUAL_BACKEND_HOST` placeholder in the Blueprint's `VITE_API_URL` with the actual backend public origin plus `/api` before applying the Blueprint (or enter it in the Static Site environment settings after creation). Trigger a new Static Site build after changing this build-time variable. Do not deploy or test authentication while the placeholder remains.
4. API requests use `${VITE_API_URL}/...`; `withCredentials: true` sends the refresh cookie. The cookie is HttpOnly, Secure in staging, scoped to `/api`, and SameSite is `None` in the Blueprint because the service origins are cross-site. Express CORS allows only the exact `CLIENT_URL` and credentials. Verify login/refresh/logout cookie behavior in browser developer tools after URLs are assigned. Do not use same-origin rewrite routing; Render Static Site rewrites serve static-site paths and are not a general reverse proxy for backend API requests.

## Runtime and uploads
The backend starts with `npm start` (`node src/server.js`). Its health endpoints are `GET /api/health` (liveness) and `GET /api/health/db` (database readiness). The backend currently uses `STORAGE_DRIVER=local`; `storage.service.js` writes uploads to the local `uploads` directory and Express serves `/uploads` from that directory. Free Render web service filesystems are ephemeral, so uploaded files may disappear on restart/redeploy. Uploaded file URLs are rooted at `/uploads/...` on the backend origin and are not routed through the frontend. Do not rely on uploaded files persisting across deploys; use synthetic/re-uploadable files only. S3/Supabase options are named in environment comments but no provider is implemented (non-local drivers throw), so durable object storage requires a separately reviewed implementation before it is usable.

## Manual staging migration procedure (no deploy hook)

Do not add an automatic migration to the Render build or start command. Run migrations manually from a protected operator workstation against the verified staging database; the frontend must never run migrations.

1. Provision the staging PostgreSQL database and record its identity from the Render dashboard: database `lms_staging`, approved Render host, port, and region. Do not use `lms_platform`, `lms_security_test`, or production.
2. In a protected local PowerShell session, obtain the staging-only external connection URL through a secret manager or secure prompt; do not place it in a saved script, profile, log, or command history. Inject it into `DATABASE_URL` only for the current process. Before Prisma commands, parse the URL internally and confirm the host belongs to the Render PostgreSQL instance, port is the assigned port, and database is `lms_staging`. Print only those non-secret fields. If a protected injection and identity check cannot be performed, stop.
3. With `DATABASE_URL` injected securely and verified as the staging database only, run from the reviewed backend release directory:

   ```powershell
   npx prisma validate
   npx prisma generate
   npx prisma migrate deploy
   npx prisma migrate status
   npm run db:init-roles
   ```

   The role initializer only upserts the four system roles. Do not run `db:seed`, `prisma:seed`, `db:reset`, or any reset/destructive SQL.
4. Verify migration status and the four role names, then redeploy/restart the backend service through Render. Check `/api/health` and `/api/health/db`.
5. Run smoke checks using synthetic staging accounts for SUPER_ADMIN, COMPANY_ADMIN, INSTRUCTOR, and EMPLOYEE; verify tenant isolation, reset invalidation, status suspend/reactivate epoch increments, old-token rejection, fresh login, and audit events. The isolated PostgreSQL security harness can be run only after the staging database URL is explicitly set and validated.

## Rollback
Retain the previous application deploy/revision. If an app deployment fails after the additive migration, roll back the application revision in Render without dropping `companies.securityVersion`; the migration is additive and the older app can ignore the column. Do not attempt to reverse the migration automatically. Free PostgreSQL has no backups, so staging is disposable and should contain no valuable data. Recreate only through a reviewed, explicit staging procedure if necessary; never apply that procedure to production.

## Render plan limitations and approval gate
- Existing legacy Free Postgres databases expire after 30 days and have no backups. Confirm in the Dashboard whether a new Free database is available for this account before applying the Blueprint. If not, staging requires approval for a paid PostgreSQL tier.
- Free web services can spin down and have ephemeral filesystems; local uploads are not durable.
- Render resource availability, database plan eligibility/current cost, Singapore region support, service hostnames, and Blueprint validation must be confirmed in the Render Dashboard before creating resources. Replace the `VITE_API_URL` bootstrap placeholder with the actual backend URL before the first usable frontend build.
- This configuration has not been deployed or tested on Render. Production remains blocked until staging smoke tests, independent production-backup restore verification, persistent upload strategy, production secrets/TLS/origin review, and operational rollback procedures are approved.
