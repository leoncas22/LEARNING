# LMS Platform

Multi-tenant Learning Management System for company/institution training,
onboarding, competency testing, and certification.

## Status: Phase 5 - Quiz & Assessment Engine

Phase 1 scaffolded the two apps. Phase 2 built the full PostgreSQL schema.
Phase 3 added authentication/authorization. Phase 4 turned it into a
functional LMS (courses, modules, lessons, training assignment, learning
progress). Phase 5 adds a complete quiz engine: HR/Instructor build quizzes
with four question types (single choice, multiple choice, true/false,
short answer), configure time limits/passing score/max attempts/shuffling,
and publish them; employees take timed, auto-graded assessments with
autosave and see their results; HR monitors scores across the company. See
`docs/phase-5.md` for the full design write-up, grading engine details,
security model, and test log; see `docs/phase-4.md`, `docs/authentication.md`,
and `docs/development-auth.md` for earlier phases.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router + TanStack Query + Axios
- **Backend**: Node.js + Express + JWT + Argon2 + Prisma ORM
- **Database**: PostgreSQL

## Folder structure

```
lms-platform/
├── frontend/       # Vite + React app
│   └── src/
│       ├── components/       # CourseCard, ModuleItem, LessonItem, LessonForm, ModuleForm,
│       │                     # EnrollmentTable, EmployeePicker, AssignTrainingForm, LessonContent,
│       │                     # MyCourseCard, QuestionEditor, QuestionCard, QuestionNavigator,
│       │                     # QuestionRenderer, QuizTimer, auth/ (AuthLayout), ui/ (Primitives, Modal)
│       ├── layouts/          # HrLayout (sidebar), EmployeeLayout
│       ├── pages/
│       │   ├── auth/          # Login, RegisterCompany, ForgotPassword, ResetPassword, VerifyEmail
│       │   ├── hr/             # HrDashboard, CourseList/CreateCourse/CourseDetail/EditCourse, Trainings,
│       │   │                   # QuizList, CreateQuiz, QuizDetail (builder), QuizResults
│       │   └── employee/        # EmployeeDashboard, MyLearning, CoursePage,
│       │                         # MyQuizzes, QuizTakingPage, QuizResultPage, QuizHistory
│       ├── hooks/               # useAuth, etc.
│       ├── services/             # authService, courseService, trainingService, learningService,
│       │                          # employeeService, miscService, quizService, quizAttemptService, apiClient
│       ├── lib/                    # tokenStore (in-memory access token), queryClient
│       ├── utils/                    # pure helper functions
│       ├── routes/                    # ProtectedRoute
│       └── contexts/                   # AuthContext
└── backend/
    ├── src/
    │   ├── controllers/   # auth, employee, course, module, lesson, training, learning, dashboard,
    │   │                   # upload, quiz, quizQuestion, quizAttempt, quizResults
    │   ├── services/       # auth, employee, mail (mock), course, module, lesson, training, learning,
    │   │                   # progress (shared calc), dashboard, storage, quiz, quizQuestion,
    │   │                   # quizGrading (pure grading engine), quizAttempt, quizResults
    │   ├── routes/           # auth, employee, health, course, module, lesson, training, learning,
    │   │                     # dashboard, upload, quiz, quizQuestion, quizAttempt
    │   ├── middleware/        # authenticate, authorize, companyAccess, validate, rateLimiter, errorHandler
    │   ├── validators/         # auth, course, training, upload, quiz.validation
    │   ├── utils/                # jwt, password, token, cookies, activityLog, slugify, pagination,
    │   │                          # sanitizeHtml, normalizeAnswer, quizSnapshot
    │   └── config/                 # env, db (Prisma singleton), auth.config
    └── prisma/
        ├── schema.prisma
        ├── seed.js
        └── migrations/
            ├── 20260821035636_init/                       # Phase 2
            ├── 20260824020746_add_authentication/          # Phase 3
            ├── 20260826103924_add_enrollment_due_date/      # Phase 4
            └── 20260830141135_add_quiz_engine/               # Phase 5
```

## Running it locally

### Backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL, then generate real secrets:
#   openssl rand -hex 32   ->  JWT_ACCESS_SECRET
#   openssl rand -hex 32   ->  JWT_REFRESH_SECRET
npm install
npx prisma generate           # generates the typed Prisma Client
npx prisma migrate dev        # applies all four migrations
npm run db:seed               # seeds realistic multi-tenant demo data + dev accounts
npm run dev
```

The API boots on `http://localhost:5000`.
- `GET /api/health` -> liveness
- `GET /api/health/db` -> DB readiness (Phase 2)
- `POST /api/auth/login`, `/logout`, `/refresh`, `GET /api/auth/me` -> Phase 3
- `POST /api/auth/register-company`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`
- `GET/POST /api/employees`, `GET /api/employees/:id` (Company Admin only)
- `/api/courses`, `/api/modules`, `/api/lessons`, `/api/trainings`, `/api/me/*`, `/api/dashboard/hr`, `/api/uploads` -> Phase 4
- `/api/quizzes`, `/api/questions`, `/api/quiz-attempts`, `/api/me/quizzes`, `/api/me/quiz-history` -> Phase 5 (see `docs/phase-5.md`)

Browse the seeded data with `npx prisma studio`. Dev login credentials are
in `docs/development-auth.md`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` - you'll land on `/login`. HR gets course
management (`/hr/courses`), a course builder, training assignment
(`/hr/trainings`), and now a quiz builder (`/hr/quizzes`) with results
monitoring. Employees get My Learning (`/employee/courses`) plus quizzes
(`/employee/quizzes`) - timed, autosaved, auto-graded - and quiz history.

`npm run build` produces a production build in `frontend/dist/`.

## What's intentionally NOT here yet

- Certificate generation, competency matrix, AI grading/question
  generation, advanced analytics, payments, live proctoring, chat, video
  conferencing, realtime notifications -> **later phases**
- A dedicated Instructor UI (permissions are enforced at the API level;
  the page itself is still a placeholder — see `docs/phase-4.md` §10 and
  `docs/phase-5.md` §10)
- Real email delivery (a mock console logger stands in - see `mail.service.js`)
- Employee invitation-by-email (temporary-password creation works today)
- Drag-and-drop reordering UI for modules/lessons/questions (the reorder
  APIs exist and are tested; no UI consumes them yet)
- Manual grading UI for essay-type questions (the `ESSAY` question type is
  reserved in the schema but not exposed in the Phase 5 builder)

## A note on this environment vs. yours

As in Phases 2-4, this sandbox's network doesn't reach
`binaries.prisma.sh`, so the Prisma CLI (`generate`/`migrate`/`studio`)
couldn't run *inside* the sandbox that built this. All four migrations are
hand-authored SQL, applied directly via `psql` against a real local
PostgreSQL 16 instance and verified there - see `docs/database.md` §10,
`docs/authentication.md` §15, `docs/phase-4.md` §9, and `docs/phase-5.md`
§9 for the full test logs (167 tests total across Phases 2-5, all
passing). On your machine, with normal internet access, the commands above
will work exactly as shown - the migration files are already in the exact
folder structure Prisma expects.

## Next: Phase 6

Certificate generation, building on Phase 5's pass/fail quiz results and
Phase 4's course completion tracking.
