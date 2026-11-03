import assert from 'node:assert/strict';
import { createEmployeeSchema, employeeListSchema, registerCompanySchema, updateEmployeeSchema } from './src/validators/auth.validation.js';

const validRegistration = {
  companyName: '  Example Learning  ',
  companyEmail: ' Info@Example.COM ',
  companySlug: 'Example Learning',
  adminName: ' Example Admin ',
  email: ' Admin@Example.COM ',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
};

const parsed = registerCompanySchema.safeParse({ body: validRegistration });
assert.equal(parsed.success, true, 'valid company registration is accepted');
assert.equal(parsed.data.body.companyEmail, 'info@example.com', 'company email is normalized');
assert.equal(parsed.data.body.email, 'admin@example.com', 'administrator email is normalized');
assert.equal(parsed.data.body.companySlug, 'example-learning', 'company identifier is normalized');
assert.equal(parsed.data.body.companyName, 'Example Learning', 'company name is trimmed');

assert.equal(registerCompanySchema.safeParse({ body: { ...validRegistration, confirmPassword: 'DifferentPass123' } }).success, false, 'password mismatch is rejected');
assert.equal(registerCompanySchema.safeParse({ body: { ...validRegistration, companyEmail: undefined } }).success, false, 'company email is required independently from admin email');
assert.equal(registerCompanySchema.safeParse({ body: { ...validRegistration, companySlug: '!!!' } }).success, false, 'identifier that normalizes to an empty slug is rejected');
assert.equal(registerCompanySchema.safeParse({ body: { ...validRegistration, role: 'SUPER_ADMIN' } }).success, false, 'public company registration cannot choose a role');
assert.equal(registerCompanySchema.safeParse({ body: { ...validRegistration, companyId: 'attacker-controlled' } }).success, false, 'public company registration cannot choose a tenant');

const managedUser = {
  name: 'New Employee',
  email: ' Employee@Example.com ',
  password: 'StrongPass123',
  role: 'EMPLOYEE',
};
assert.equal(createEmployeeSchema.safeParse({ body: managedUser }).success, true, 'employee provisioning payload is valid');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, role: 'COMPANY_ADMIN' } }).success, false, 'provisioning schema rejects company-admin promotion');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, role: 'SUPER_ADMIN' } }).success, false, 'provisioning schema rejects super-admin promotion');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, companyId: 'attacker-controlled' } }).success, false, 'provisioning schema rejects client-supplied company id');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, roleId: 'attacker-controlled' } }).success, false, 'provisioning schema rejects client-supplied role id');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, role: 'COMPANY_ADMIN' } }).success, false, 'company-admin assignment is rejected');
assert.equal(createEmployeeSchema.safeParse({ body: { ...managedUser, role: 'SUPER_ADMIN' } }).success, false, 'platform-admin assignment is rejected');
assert.equal(updateEmployeeSchema.safeParse({ body: { role: 'INSTRUCTOR' } }).success, true, 'permitted employee role changes are accepted');
assert.equal(updateEmployeeSchema.safeParse({ body: { role: 'COMPANY_ADMIN' } }).success, false, 'company-admin promotion is rejected by update validation');
assert.equal(employeeListSchema.safeParse({ query: { role: 'COMPANY_ADMIN' } }).success, true, 'company-admin role filtering is accepted independently');
assert.equal(employeeListSchema.safeParse({ query: { role: 'INSTRUCTOR' } }).success, true, 'instructor role filtering is accepted independently');
assert.equal(employeeListSchema.safeParse({ query: { role: 'INVALID_ROLE' } }).success, false, 'unknown role filters are rejected');
console.log('Registration and provisioning validation checks passed: 22/22');
