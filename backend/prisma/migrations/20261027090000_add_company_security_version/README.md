# Company security version migration
This additive migration introduces `companies.securityVersion`, initialized to `0` for existing companies. It is incremented only by Super Admin company-status transitions and included in newly issued tenant access JWTs. Ordinary profile edits do not invalidate tokens.

Production sequence (after backup and staging verification):
1. Stop or drain backend instances so old and new application versions do not serve concurrently with different epoch semantics.
2. Deploy the updated application source and generated Prisma Client artifacts.
3. With the production `DATABASE_URL` configured only in the protected deployment environment, run `npx prisma migrate deploy` once.
4. Start the new backend instances and verify company-scoped login, protected access, status transition, reactivation, and fresh login.

Do not use `prisma migrate dev`, reset, seed, or manual destructive SQL in production. Existing access JWTs will not contain `companySecurityVersion` and will be rejected for company-scoped users after this version is deployed; those users must authenticate afresh. Super Admin tokens remain company-independent.
