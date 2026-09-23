# Database Architecture — Phase 2

## 1. Overview

PostgreSQL 16 + Prisma ORM. All primary keys are UUIDs. All tenant-scoped
tables carry (directly or via a parent) a `companyId` — that column is the
entire multi-tenant isolation strategy for this system.

## 2. Multi-tenant strategy

```
Platform
  ├── Company A → Departments, Positions, Users, Courses, LearningPaths
  ├── Company B → Departments, Positions, Users, Courses, LearningPaths
  └── Company C → ...
```

**Rule: `companyId` is never trusted from the frontend.** In Phase 3, every
authenticated request resolves `companyId` from the decoded JWT
(`req.user.companyId`), and every tenant-scoped Prisma query filters by it
server-side. A `SUPER_ADMIN` account has `companyId = NULL` and is the only
role allowed to query across tenants.

Tables that are *not* directly tenant-scoped (`Module`, `Lesson`, `Question`,
`QuestionOption`, `QuizAnswer`, `QuizAnswerOption`, `LearningPathCourse`)
inherit their tenant through their parent (`Module.course.companyId`, etc.) —
duplicating `companyId` on every child table would violate normalization
without adding real query value, since access always starts from the
tenant-scoped parent.

Verified directly against a live PostgreSQL instance during this phase:
`SELECT * FROM users WHERE "companyId" = 'A'` never returns a Company B row,
even though both companies have overlapping data shapes (same department
names, same `employeeNumber` sequence `EMP-001..EMP-010`).

## 3. Delete-behavior strategy

| Relationship | Behavior | Why |
|---|---|---|
| Course → Module → Lesson | `CASCADE` | No independent meaning without the course/module. |
| Question → QuestionOption | `CASCADE` | Options don't exist without their question. |
| LearningPath → LearningPathCourse | `CASCADE` | Junction row, no independent value. |
| Company → User / Course / Department / Position / LearningPath | `RESTRICT` | Companies are deactivated (`status`), never hard-deleted once they hold data. Restrict is the DB-level guardrail against an accidental cascade wiping a whole tenant. |
| User → Enrollment / LessonProgress / QuizAttempt / Certificate / AssignmentSubmission | `RESTRICT` | Same logic — users are soft-deleted (`deletedAt`, `status`), historical learning records must survive. |
| Course → Enrollment, Lesson → LessonProgress | `RESTRICT` | Participation history is HR/compliance data; archive the course instead of deleting it. |
| Quiz → QuizAttempt, Question → QuizAnswer, Assignment → AssignmentSubmission | `RESTRICT` | Explicitly called out in the spec — never silently lose graded history. Use `status = ARCHIVED` on the quiz/course instead of deleting. |
| Certificate → User / Course | `RESTRICT` | Certificates are permanent compliance records. |
| ActivityLog → User / Company | `SET NULL` | The audit trail must outlive the actor or tenant record. |
| Notification → User | `CASCADE` | Ephemeral UI state, not a compliance record. |
| User.departmentId / positionId, Course.instructorId, Enrollment.assignedById, AssignmentSubmission.gradedById | `SET NULL` | Losing the org-chart link shouldn't block deleting a department/position/user; the historical row just loses that pointer. |

This was exercised directly, not just designed on paper: in-sandbox tests
confirmed a `Course` delete cascades to its `Module`s, and a `Course` delete
is correctly **blocked** once it has `Enrollment`s, same for a `User` with
`QuizAttempt`s/`Certificate`s.

## 4. Data validation

Prisma has no native `@check` support for the version pinned here, so bounded
integers are enforced two ways:
1. **Database CHECK constraints** (added via raw SQL in the migration):
   `courses.passingScore`, `quizzes.passingScore`, `quiz_attempts.score`,
   `lesson_progress.progressPercentage`, `certificates.score`,
   `questions.points`, `assignment_submissions.score`.
2. **Application-layer validation** (Zod, Phase 3+) as the first line of
   defense — the DB constraint is the backstop, not the primary UX.

Verified directly: inserting `progressPercentage = 101` or `-1` is rejected
by Postgres with a `CHECK constraint` violation.

## 5. Soft delete

Only `Company` and `User` get a `deletedAt` column. Both are entities whose
*history* other rows depend on (a department's users, a course's
enrollments) — hard-deleting them would either cascade destruction across
the tenant or get blocked by the `RESTRICT` rules above. Everything else
either has its own status enum (`Course.status = ARCHIVED`,
`Quiz.status = ARCHIVED`) or is inherently a historical record that's never
meant to be deleted at all (`QuizAnswer`, `ActivityLog`, `Certificate`).

## 6. Indexing

Indexes were added on: every tenant-isolation FK (`companyId` on Company's
direct children), every foreign key used for filtering in reports
(`Course.instructorId`, `Course.status`, `Enrollment.userId/courseId/status`,
`QuizAttempt.userId/quizId`, `Notification.userId/isRead`), the audit trail's
`(companyId, userId, createdAt)`, and every field used for lookup/verification
(`User.email`, `Certificate.certificateNumber`). Composite unique constraints
(`(companyId, slug)`, `(companyId, name)`, `(userId, courseId)`, etc.) also
serve as indexes automatically.

## 7. Entity Relationship Diagram

```mermaid
erDiagram
    COMPANY ||--o{ DEPARTMENT : has
    COMPANY ||--o{ POSITION : has
    COMPANY ||--o{ USER : has
    COMPANY ||--o{ COURSE : owns
    COMPANY ||--o{ LEARNING_PATH : owns
    COMPANY ||--o{ ACTIVITY_LOG : logs

    ROLE ||--o{ USER : assigned_to

    DEPARTMENT ||--o{ USER : contains
    POSITION ||--o{ USER : contains

    USER ||--o{ COURSE : instructs
    USER ||--o{ ENROLLMENT : enrolled_in
    USER ||--o{ LESSON_PROGRESS : tracks
    USER ||--o{ QUIZ_ATTEMPT : attempts
    USER ||--o{ ASSIGNMENT_SUBMISSION : submits
    USER ||--o{ CERTIFICATE : earns
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY_LOG : performs

    COURSE ||--o{ MODULE : contains
    COURSE ||--o{ ENROLLMENT : receives
    COURSE ||--o{ QUIZ : has
    COURSE ||--o{ ASSIGNMENT : has
    COURSE ||--o{ CERTIFICATE : issues
    COURSE ||--o{ LEARNING_PATH_COURSE : included_in

    MODULE ||--o{ LESSON : contains
    LESSON ||--o{ LESSON_PROGRESS : tracked_by

    QUIZ ||--o{ QUESTION : contains
    QUIZ ||--o{ QUIZ_ATTEMPT : has
    QUESTION ||--o{ QUESTION_OPTION : has
    QUESTION ||--o{ QUIZ_ANSWER : answered_by
    QUIZ_ATTEMPT ||--o{ QUIZ_ANSWER : contains
    QUIZ_ANSWER ||--o{ QUIZ_ANSWER_OPTION : selects
    QUESTION_OPTION ||--o{ QUIZ_ANSWER_OPTION : selected_in

    ASSIGNMENT ||--o{ ASSIGNMENT_SUBMISSION : receives

    LEARNING_PATH ||--o{ LEARNING_PATH_COURSE : sequences
```

## 8. Migration workflow

Schema lives in `backend/prisma/schema.prisma`. The applied migration is
`backend/prisma/migrations/20260821035636_init/migration.sql`.

```bash
cd backend
npx prisma generate       # generate Prisma Client
npx prisma migrate dev    # create/apply migrations (dev)
npx prisma migrate deploy # apply migrations (CI/production)
npx prisma studio         # browse data
```

> **A note on how this migration was produced and verified.** This sandbox's
> outbound network is allow-listed to a fixed domain set for security, and
> `binaries.prisma.sh` — where Prisma's CLI downloads its query/schema-engine
> binaries — isn't on that list. That means `prisma generate` / `migrate` /
> `studio` cannot run inside *this* sandbox. To still deliver a real, tested
> foundation rather than an untested guess: I installed PostgreSQL 16 in the
> sandbox, hand-derived `migration.sql` from `schema.prisma`, and applied it
> with `psql` directly against a live database — then seeded realistic data
> and ran the full constraint/isolation test suite in §9 against it, all
> passing. `schema.prisma` and `migration.sql` are both committed, in the
> exact folder structure Prisma expects, so `prisma migrate dev` on your own
> machine (with normal internet access) will recognize the existing
> migration and apply cleanly — no regeneration needed. Only `prisma
> generate` (to produce the typed client) needs to run somewhere with access
> to `binaries.prisma.sh`.

## 9. Seed data

`backend/prisma/seed.js` creates, per the Phase 2 spec minimums: 1 Super
Admin, 2 Companies, each with 1 Company Admin, 2 Instructors, 10 Employees,
5 Departments, 5 Positions, 5 Courses (3 Modules × 3 Lessons each), 2
published Quizzes (5 Questions × 4 Options each) with a graded attempt, 1
Assignment with a graded submission, a Learning Path linking 3 courses,
Enrollments, a Certificate, a Notification, and an ActivityLog entry — all
genuinely related to each other (Employee → Enrollment → Course → Module →
Lesson, Employee → QuizAttempt → QuizAnswer, etc.), not standalone rows.

Every seeded user's password is `Password123!` (hashed with argon2) —
development-only, never used in production.

```bash
npm run db:seed
# or, to reset + reapply migrations + reseed in one step:
npm run db:reset
```

## 10. Testing performed (this phase, against a live database)

| # | Test | Result |
|---|---|---|
| 1 | Database connects | PASS |
| 2 | Migration applies with zero errors (23 tables, all FKs/indexes) | PASS |
| 3 | Seed data creates fully-linked records (Company→Dept→Employee→Enrollment→Course→Module→Lesson, Course→Quiz→Question→Option, Employee→QuizAttempt→QuizAnswer) | PASS |
| 4 | Cross-model relations are joinable | PASS |
| 5 | Duplicate `(userId, courseId)` enrollment rejected | PASS |
| 6 | Duplicate `certificateNumber` rejected | PASS |
| 7 | Duplicate department name within the same company rejected | PASS |
| 8 | `progressPercentage = 101` and `= -1` both rejected by CHECK constraint | PASS |
| 9 | Company A data never appears in a Company B–scoped query | PASS |
| 10 | Deleting a Course cascades to its Modules | PASS |
| 11 | Deleting a Course with active Enrollments is blocked (Restrict) | PASS |
| 12 | Deleting a User with QuizAttempts/Certificates is blocked (Restrict) | PASS |
| 13 | Same `employeeNumber` ("EMP-001") coexists across two different companies | PASS |

## 11. Environment variables

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

`.env` is git-ignored (see `backend/.gitignore`); only `.env.example` is
committed, with placeholder credentials.
