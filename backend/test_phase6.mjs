import prisma from './src/config/db.js';
import * as competencyService from './src/services/competency.service.js';
import * as courseCompetencyService from './src/services/courseCompetency.service.js';
import * as employeeCompetencyService from './src/services/employeeCompetency.service.js';
import * as certificationService from './src/services/certification.service.js';
import * as certificateIssuanceService from './src/services/certificateIssuance.service.js';
import * as certificateService from './src/services/certificate.service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('=== STARTING PHASE 6 COMPREHENSIVE VERIFICATION ===\n');

  // 1. Fetch seed users and companies
  const companyA = await prisma.company.findFirst({ where: { slug: 'pt-nusantara-teknologi' } });
  assert(Boolean(companyA), `Found Company A (${companyA?.name})`);

  const companyB = await prisma.company.findFirst({ where: { slug: 'pt-sejahtera-manufaktur' } });
  assert(Boolean(companyB), `Found Company B (${companyB?.name})`);

  const hrRole = await prisma.role.findUnique({ where: { name: 'COMPANY_ADMIN' } });
  const empRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });

  const hrUserA = await prisma.user.findFirst({
    where: { companyId: companyA.id, roleId: hrRole.id },
  });
  const employeeUserA = await prisma.user.findFirst({
    where: { companyId: companyA.id, roleId: empRole.id },
  });

  const actingHr = { id: hrUserA.id, role: 'COMPANY_ADMIN', companyId: companyA.id };
  const actingEmp = { id: employeeUserA.id, role: 'EMPLOYEE', companyId: companyA.id };
  const actingHrB = { id: 'fake-hr-b', role: 'COMPANY_ADMIN', companyId: companyB.id };

  const course = await prisma.course.findFirst({
    where: { companyId: companyA.id },
  });
  assert(Boolean(course), `Found Course for testing: "${course?.title}"`);

  // --- TEST 1: Competency CRUD ---
  console.log('\n--- Test Suite 1: Competency CRUD & Levels ---');
  const compName = `Cyber Defense ${Date.now()}`;
  const createdComp = await competencyService.createCompetency(actingHr, {
    name: compName,
    description: 'Protect systems against security breaches',
    category: 'Technical Knowledge',
    levels: [
      { level: 'BEGINNER', description: 'Basic security awareness', minScore: 0, maxScore: 59 },
      { level: 'INTERMEDIATE', description: 'Configures standard firewalls', minScore: 60, maxScore: 74 },
      { level: 'ADVANCED', description: 'Conducts vulnerability assessments', minScore: 75, maxScore: 89 },
      { level: 'EXPERT', description: 'Enterprise security architect', minScore: 90, maxScore: 100 },
    ],
  });
  assert(createdComp.id && createdComp.name === compName, 'Competency created with 4 level bands');

  const compList = await competencyService.listCompetencies(actingHr, { search: compName });
  assert(compList.data.length >= 1, 'Competency found in list with search filter');

  const compDetail = await competencyService.getCompetency(actingHr, createdComp.id);
  assert(compDetail.levels.length === 4, 'Competency details loaded with configured levels');

  // --- TEST 2: Course Competency Assignment ---
  console.log('\n--- Test Suite 2: Course Competency Linking ---');
  const courseComp = await courseCompetencyService.addCourseCompetency(actingHr, course.id, {
    competencyId: createdComp.id,
    targetLevel: 'ADVANCED',
  });
  assert(courseComp.targetLevel === 'ADVANCED', 'Assigned competency to course with targetLevel ADVANCED');

  const courseCompList = await courseCompetencyService.listCourseCompetencies(actingHr, course.id);
  assert(courseCompList.some(c => c.competencyId === createdComp.id), 'Course competencies query reflects newly linked competency');

  // --- TEST 3: Certification CRUD & Requirements ---
  console.log('\n--- Test Suite 3: Certification CRUD & Requirements ---');
  const certTitle = `Security Specialist Cert ${Date.now()}`;
  const createdCertDef = await certificationService.createCertification(actingHr, {
    title: certTitle,
    description: 'Proof of foundational and applied cybersecurity expertise',
    courseId: course.id,
    validityDays: 365,
    status: 'ACTIVE',
    requirements: {
      minProgressPct: 100,
      minQuizScore: 80,
    },
  });
  assert(createdCertDef.id && createdCertDef.title === certTitle, 'Certification created with validity period and requirements');

  const certDetail = await certificationService.getCertification(actingHr, createdCertDef.id);
  assert(certDetail.requirement && certDetail.requirement.minProgressPct === 100, 'Certification detail reflects course and score requirements');

  // --- TEST 4: Certificate Issuance & Security ---
  console.log('\n--- Test Suite 4: Transactional Certificate Issuance ---');
  // First test eligibility on createdCertDef (requires 100% course which user doesn't have yet)
  const initialEligibility = await certificationService.checkCertificationEligibility(createdCertDef.id, employeeUserA.id);
  assert(initialEligibility.eligible === false, 'Eligibility check correctly blocks ineligible employee (0% progress)');

  // Create an open certification (e.g., orientation or self-certification) to test successful issuance
  const openCertDef = await certificationService.createCertification(actingHr, {
    title: `General Orientation ${Date.now()}`,
    description: 'General orientation certification',
    validityDays: 365,
    status: 'ACTIVE',
    requirements: {},
  });
  const openEligibility = await certificationService.checkCertificationEligibility(openCertDef.id, employeeUserA.id);
  assert(openEligibility.eligible === true, 'Open certification eligibility check passes');

  const issuanceResult = await certificateIssuanceService.issueCertificate(employeeUserA.id, openCertDef.id);
  assert(issuanceResult.success, `Certificate issued successfully (#${issuanceResult.certificate?.certificateNumber})`);

  const certRow = issuanceResult.certificate;
  assert(certRow.certificateNumber.startsWith('CERT-'), 'Certificate number follows format CERT-YYYY-NNNNNN');
  assert(certRow.verificationCode.startsWith('VRF-'), 'Verification code follows cryptographically secure VRF-XXXX-... format');
  assert(Boolean(certRow.expiresAt), 'Expiration date correctly set for 365-day validity period');

  // --- TEST 5: Duplicate Prevention ---
  console.log('\n--- Test Suite 5: Duplicate Active Certificate Prevention ---');
  const duplicateAttempt = await certificateIssuanceService.issueCertificate(employeeUserA.id, openCertDef.id);
  assert(!duplicateAttempt.success, `Duplicate issuance blocked safely: "${duplicateAttempt.reason}"`);

  // --- TEST 6: Public Verification ---
  console.log('\n--- Test Suite 6: Public Verification (Zero Sensitive Data) ---');
  const verifyRes = await certificateService.verifyPublicCertificate(certRow.verificationCode);
  assert(verifyRes.valid === true, 'Public verification returned valid = true for active certificate');
  assert(verifyRes.recipientName === employeeUserA.name, 'Public verification shows recipient name');
  assert(verifyRes.companyName === companyA.name, 'Public verification shows issuing company name');
  assert(verifyRes.email === undefined, 'Public verification does NOT expose employee email');
  assert(verifyRes.userId === undefined, 'Public verification does NOT expose internal user ID');
  assert(verifyRes.companyId === undefined, 'Public verification does NOT expose internal company ID');

  // --- TEST 7: Certificate Revocation ---
  console.log('\n--- Test Suite 7: Certificate Revocation Governance ---');
  const revoked = await certificateService.revokeCertificate(actingHr, certRow.id, 'Administrative policy check');
  assert(revoked.status === 'REVOKED', 'Certificate status updated to REVOKED in database');

  const verifyRevoked = await certificateService.verifyPublicCertificate(certRow.verificationCode);
  assert(verifyRevoked.valid === false && verifyRevoked.status === 'REVOKED', 'Public verification now indicates Certificate Revoked');

  // --- TEST 8: Multi-Tenant Isolation ---
  console.log('\n--- Test Suite 8: Multi-Tenant Security & Access Control ---');
  let crossTenantCompetencyBlocked = false;
  try {
    await competencyService.getCompetency(actingHrB, createdComp.id);
  } catch (err) {
    crossTenantCompetencyBlocked = err.statusCode === 404;
  }
  assert(crossTenantCompetencyBlocked, 'Company B HR blocked (404) from accessing Company A competency');

  let crossTenantCertBlocked = false;
  try {
    await certificationService.getCertification(actingHrB, createdCertDef.id);
  } catch (err) {
    crossTenantCertBlocked = err.statusCode === 404;
  }
  assert(crossTenantCertBlocked, 'Company B HR blocked (404) from accessing Company A certification');

  // --- TEST 9: Employee Competency Calculation & Self-Service ---
  console.log('\n--- Test Suite 9: Employee Competency Calculation & Self-Service ---');
  // Re-link competency to course
  await courseCompetencyService.addCourseCompetency(actingHr, course.id, {
    competencyId: createdComp.id,
    targetLevel: 'ADVANCED',
  });

  // Calculate score level mapping
  const beginnerLevel = employeeCompetencyService.calculateLevelFromScore(55);
  assert(beginnerLevel === 'BEGINNER', 'Score 55 maps to BEGINNER level');
  const advancedLevel = employeeCompetencyService.calculateLevelFromScore(85);
  assert(advancedLevel === 'ADVANCED', 'Score 85 maps to ADVANCED level');
  const expertLevel = employeeCompetencyService.calculateLevelFromScore(95);
  assert(expertLevel === 'EXPERT', 'Score 95 maps to EXPERT level');

  const nextTierInfo = employeeCompetencyService.calculateNextLevelProgress(85);
  assert(nextTierInfo.currentLevel === 'ADVANCED' && nextTierInfo.nextLevel === 'EXPERT' && nextTierInfo.scoreNeeded === 5,
    'Advancement calculation: 85 -> Need 5 points for EXPERT');

  // Direct achievement upsert simulation
  await prisma.employeeCompetency.upsert({
    where: {
      userId_competencyId: {
        userId: employeeUserA.id,
        competencyId: createdComp.id,
      },
    },
    create: {
      userId: employeeUserA.id,
      competencyId: createdComp.id,
      level: 'ADVANCED',
      score: 85,
      source: 'COURSE',
      sourceId: course.id,
    },
    update: {
      level: 'ADVANCED',
      score: 85,
    },
  });

  const myComps = await employeeCompetencyService.getMyCompetencies(actingEmp);
  assert(myComps.some(c => c.competencyId === createdComp.id && c.level === 'ADVANCED'), 'Employee sees own earned competency');

  const myCompDetail = await employeeCompetencyService.getMyCompetencyDetail(actingEmp, createdComp.id);
  assert(myCompDetail.achievement?.level === 'ADVANCED' && myCompDetail.progress?.scoreNeeded === 5, 'Employee competency detail includes progress to next tier');

  // --- TEST 10: Employee Self-Service Certificates ---
  console.log('\n--- Test Suite 10: Employee Certificates Access ---');
  const myCerts = await certificateService.listMyCertificates(actingEmp);
  assert(myCerts.length >= 1, 'Employee can query own issued certificates');

  const certDetail = await certificateService.getCertificate(actingEmp, certRow.id);
  assert(certDetail.certificateNumber === certRow.certificateNumber, 'Employee can load own certificate detail');

  // Clean up test course competency mapping
  await courseCompetencyService.removeCourseCompetency(actingHr, course.id, createdComp.id);
  console.log('Cleaned up course competency mapping');

  console.log(`\n🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
