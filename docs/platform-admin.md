# Platform administration

The platform control center is available to `SUPER_ADMIN` at `/admin`.

## Capabilities

- `/admin`: platform-wide company, user, course, assignment, and recent-activity summary.
- `/admin/users`: list, search, filter, create, edit, activate/deactivate, and soft-delete accounts across companies.
- `/admin/companies`: review companies and change their status.

The API is mounted at `/api/admin`. Every route first authenticates the request and then requires `SUPER_ADMIN`; frontend route protection is only a usability layer.

## Account safety rules

- Company-scoped users must be assigned to an existing company.
- `SUPER_ADMIN` accounts must not be assigned to a company, department, or position.
- Department and position references must belong to the selected company.
- Role and status changes revoke active refresh sessions.
- An administrator cannot delete their own account or change their own role, status, or company assignment through platform user management.
- The last active `SUPER_ADMIN` cannot be disabled, demoted, or deleted.
- User deletion is a soft delete (`deletedAt` plus `INACTIVE` status), not a physical database deletion. Related learning records and audit history are preserved, and active refresh sessions are revoked.
- Setting a company to `INACTIVE` or `SUSPENDED` blocks its users from login, refresh, and authenticated API access until the company is active again.
- Company records are not hard-deleted from this control center.

## Verification

Run `npm run test:platform-admin` in `backend` for focused source-contract checks. These checks do not exercise a live database. A browser sign-in with a `SUPER_ADMIN` account is still required to verify the complete UI/API flow in the target environment.
