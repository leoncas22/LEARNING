import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.LMS_ADMIN_USER;
const ADMIN_PASSWORD = process.env.LMS_ADMIN_PASSWORD;
const COMPANY_NAME = 'PT Nusantara Teknologi';
const COMPANY_SLUG = 'pt-nusantara-teknologi';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('LMS_ADMIN_USER and LMS_ADMIN_PASSWORD are required for development account restoration');
}

try {
  const result = await prisma.$transaction(async (tx) => {
    let company = await tx.company.findUnique({ where: { slug: COMPANY_SLUG }, select: { id: true, name: true } });
    let companyCreated = false;
    if (!company) {
      company = await tx.company.create({
        data: {
          name: COMPANY_NAME,
          slug: COMPANY_SLUG,
          email: `hr@${COMPANY_SLUG}.co.id`,
          industry: 'Technology',
          subscriptionPlan: 'BUSINESS',
          status: 'ACTIVE',
        },
        select: { id: true, name: true },
      });
      companyCreated = true;
    }

    const role = await tx.role.findUnique({ where: { name: 'COMPANY_ADMIN' }, select: { id: true, name: true } });
    if (!role) throw new Error('COMPANY_ADMIN role is missing; refusing to create a duplicate role during account restoration');

    const existing = await tx.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true, password: true, companyId: true, roleId: true, status: true, deletedAt: true } });
    let adminCreated = false;
    let passwordRepaired = false;
    let admin;
    if (existing) {
      const passwordValid = await verifyPassword(existing.password, ADMIN_PASSWORD);
      passwordRepaired = !passwordValid;
      const needsUpdate = existing.companyId !== company.id || existing.roleId !== role.id || existing.status !== 'ACTIVE' || existing.deletedAt !== null || passwordRepaired;
      if (needsUpdate) {
        admin = await tx.user.update({ where: { id: existing.id }, data: { companyId: company.id, roleId: role.id, status: 'ACTIVE', deletedAt: null, ...(passwordRepaired ? { password: await hashPassword(ADMIN_PASSWORD) } : {}) }, select: { id: true } });
      } else admin = { id: existing.id };
    } else {
      const employeeNumberConflict = await tx.user.findFirst({ where: { companyId: company.id, employeeNumber: 'EMP-000' }, select: { id: true } });
      const employeeNumber = employeeNumberConflict ? 'EMP-ADMIN-000' : 'EMP-000';
      const alternateConflict = employeeNumber === 'EMP-ADMIN-000'
        ? await tx.user.findFirst({ where: { companyId: company.id, employeeNumber }, select: { id: true } })
        : null;
      if (alternateConflict) throw new Error('Both expected development employee numbers are already occupied; refusing to modify unrelated users');
      admin = await tx.user.create({
        data: {
          companyId: company.id,
          roleId: role.id,
          name: `HR Admin ${COMPANY_NAME}`,
          email: ADMIN_EMAIL,
          password: await hashPassword(ADMIN_PASSWORD),
          employeeNumber,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });
      adminCreated = true;
    }
    return { companyCreated, roleFound: true, adminCreated, passwordRepaired, adminId: admin.id, companyId: company.id };
  });
  console.log(JSON.stringify({ completed: true, company: result.companyCreated ? 'created' : 'reused', role: 'reused', admin: result.adminCreated ? 'created' : 'reused', passwordRepaired: result.passwordRepaired }));
} finally {
  await prisma.$disconnect();
}
