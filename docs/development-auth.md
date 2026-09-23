# Development Auth Credentials

**Development only. Never use these as default production credentials.**

Created by `backend/prisma/seed.js`. Every seeded account uses the same
password:

```
Password123!
```

| Role | Email | Company |
|---|---|---|
| SUPER_ADMIN | `superadmin@lms.dev` | — (platform-level) |
| COMPANY_ADMIN | `hr.admin@pt-nusantara-teknologi.co.id` | PT Nusantara Teknologi |
| INSTRUCTOR | `instructor1@pt-nusantara-teknologi.co.id` | PT Nusantara Teknologi |
| EMPLOYEE | `employee1@pt-nusantara-teknologi.co.id` | PT Nusantara Teknologi |
| COMPANY_ADMIN | `hr.admin@pt-sejahtera-manufaktur.co.id` | PT Sejahtera Manufaktur |
| INSTRUCTOR | `instructor1@pt-sejahtera-manufaktur.co.id` | PT Sejahtera Manufaktur |
| EMPLOYEE | `employee1@pt-sejahtera-manufaktur.co.id` | PT Sejahtera Manufaktur |

(Employees run `employee1`–`employee10` per company, e.g.
`employee7@pt-sejahtera-manufaktur.co.id`.)

## Suggested manual test pass

1. Log in as `employee1@pt-nusantara-teknologi.co.id` → should land on `/employee`.
2. From that session, try `GET /api/employees` directly → expect `403 Forbidden`.
3. Log in as `hr.admin@pt-nusantara-teknologi.co.id` → should land on `/hr`.
4. `GET /api/employees` → should list only PT Nusantara Teknologi's employees.
5. `GET /api/employees/:id` using an id copied from PT Sejahtera Manufaktur → expect `404 Not Found` (not 403 — see docs/authentication.md §7).
6. Log out, then try `GET /api/auth/me` → expect `401 Unauthorized`.
7. Log in again, wait 15+ minutes (or edit `JWT_ACCESS_EXPIRES_IN` down for a quick test), make any request → the Axios interceptor should transparently refresh and retry without you noticing.
8. `POST /api/auth/forgot-password` with a real seeded email and with a made-up one → identical response either way; check the server console for the mock email log.
