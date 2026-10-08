# LMS Platform
A multi-tenant Learning Management System for companies and institutions.

## Overview
The platform provides tenant-isolated learning administration and employee development workflows. Implemented areas include:

- JWT authentication with rotating refresh tokens, email verification, password recovery, and server-side RBAC
- Company isolation for users, departments, positions, courses, assignments, records, and reporting
- Employee and user management, departments, positions, instructor workspace, announcements, notifications, and audit logs
- Course, module, lesson, rich content, uploads, learning paths, training programs, assignments, and progress tracking
- Quizzes and assessment workflows with multiple question types, timed attempts, autosave, grading, results, and history
- Certifications, certificate issuance, expiration/revocation, public certificate verification, and competency management
- Reporting and analytics for learning activity, assessments, certifications, competencies, employees, and departments
## Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, TanStack Query, and Axios
- **Backend**: Node.js, Express, JWT, Argon2, and Prisma ORM
- **Database**: PostgreSQL
## Repository structure
- `frontend/` — React application, role-based workspaces, learning interfaces, and verification scripts
- `backend/src/` — API routes, controllers, services, validation, middleware, and configuration
- `backend/prisma/` — Prisma schema, seed data, and migration history
- `docs/` — architecture and feature documentation
## Running locally
### Backend
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL and generate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET locally.
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

The API runs on `http://localhost:5000`. Use `docs/development-auth.md` for local development account guidance. Do not commit `.env` files or credentials.

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` and sign in through the application. The frontend production bundle can be generated with:

```bash
npm run build
```

## Documentation
- [Authentication & Authorization](docs/authentication.md)
- [Database Architecture](docs/database.md)
- [LMS Core](docs/lms-core.md)
- [Quiz and Assessment](docs/quiz-assessment.md)
- [Certification and Competency](docs/certification-competency.md)
- [Development Authentication](docs/development-auth.md)

Prisma migration directory names are preserved because they are immutable migration identities.
