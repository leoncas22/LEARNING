import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Development-only dummy password for every seeded account.
// NEVER reuse this for anything beyond local development.
const DEV_PASSWORD = 'Password123!';

const DEPARTMENTS = ['IT', 'Human Resources', 'Finance', 'Marketing', 'Operations'];
const POSITIONS = ['HR Manager', 'Software Engineer', 'UI/UX Designer', 'Marketing Staff', 'Intern'];
const COURSE_TITLES = [
  'Cyber Security Awareness',
  'Workplace Safety Basics',
  'Company Culture & Values',
  'Effective Communication',
  'Data Privacy Fundamentals',
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedCompany(role, index) {
  const name = index === 0 ? 'PT Nusantara Teknologi' : 'PT Sejahtera Manufaktur';
  const slug = slugify(name);

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      email: `hr@${slug}.co.id`,
      industry: index === 0 ? 'Technology' : 'Manufacturing',
      subscriptionPlan: 'BUSINESS',
      status: 'ACTIVE',
    },
  });

  const departments = await Promise.all(
    DEPARTMENTS.map((deptName) =>
      prisma.department.create({ data: { companyId: company.id, name: deptName } })
    )
  );

  const positions = await Promise.all(
    POSITIONS.map((posName) =>
      prisma.position.create({ data: { companyId: company.id, name: posName } })
    )
  );

  const passwordHash = await argon2.hash(DEV_PASSWORD);

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: role.COMPANY_ADMIN.id,
      departmentId: departments[1].id, // Human Resources
      name: `HR Admin ${name}`,
      email: `hr.admin@${slug}.co.id`,
      password: passwordHash,
      employeeNumber: 'EMP-000',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const instructors = [];
  for (let i = 1; i <= 2; i++) {
    instructors.push(
      await prisma.user.create({
        data: {
          companyId: company.id,
          roleId: role.INSTRUCTOR.id,
          departmentId: departments[0].id, // IT
          name: `Instructor ${i} ${name}`,
          email: `instructor${i}@${slug}.co.id`,
          password: passwordHash,
          employeeNumber: `EMP-INS-${i}`,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      })
    );
  }

  const employees = [];
  for (let i = 1; i <= 10; i++) {
    employees.push(
      await prisma.user.create({
        data: {
          companyId: company.id,
          roleId: role.EMPLOYEE.id,
          departmentId: departments[i % departments.length].id,
          positionId: positions[i % positions.length].id,
          name: `Employee ${i} ${name}`,
          email: `employee${i}@${slug}.co.id`,
          password: passwordHash,
          employeeNumber: `EMP-${String(i).padStart(3, '0')}`,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      })
    );
  }

  const courses = [];
  for (const [ci, title] of COURSE_TITLES.entries()) {
    const course = await prisma.course.create({
      data: {
        companyId: company.id,
        instructorId: instructors[ci % 2].id,
        title,
        slug: slugify(title),
        description: `${title} training module`,
        category: 'Onboarding',
        difficulty: 'BEGINNER',
        passingScore: 80,
        status: 'PUBLISHED',
      },
    });
    courses.push(course);

    const lessons = [];
    for (let m = 1; m <= 3; m++) {
      const mod = await prisma.module.create({
        data: { courseId: course.id, title: `Module ${m}`, order: m },
      });
      for (let l = 1; l <= 3; l++) {
        const lesson = await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: `Lesson ${l}`,
            type: 'TEXT',
            content: `Content for lesson ${l}`,
            order: l,
          },
        });
        lessons.push(lesson);
      }
    }

    // Enroll every employee in the first two courses of each company.
    if (ci < 2) {
      for (const emp of employees) {
        await prisma.enrollment.create({
          data: {
            userId: emp.id,
            courseId: course.id,
            assignedById: admin.id,
            status: 'IN_PROGRESS',
          },
        });
      }
      await prisma.lessonProgress.create({
        data: {
          userId: employees[0].id,
          lessonId: lessons[0].id,
          progressPercentage: 60,
          completed: false,
          startedAt: new Date(),
        },
      });
    }

    // Quiz + questions on the first two courses.
    if (ci < 2) {
      const quiz = await prisma.quiz.create({
        data: {
          courseId: course.id,
          title: `${title} - Final Quiz`,
          passingScore: 80,
          attemptLimit: 3,
          status: 'PUBLISHED',
        },
      });

      const questions = [];
      for (let q = 1; q <= 5; q++) {
        const question = await prisma.question.create({
          data: {
            quizId: quiz.id,
            question: `Question ${q} for ${title}?`,
            type: 'MULTIPLE_CHOICE',
            points: 1,
            order: q,
          },
        });
        questions.push(question);

        const letters = ['A', 'B', 'C', 'D'];
        await Promise.all(
          letters.map((letter, oi) =>
            prisma.questionOption.create({
              data: {
                questionId: question.id,
                optionText: `Option ${letter} for Q${q}`,
                isCorrect: oi === 0,
                order: oi,
              },
            })
          )
        );
      }

      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: employees[0].id,
          attemptNumber: 1,
          score: 87,
          status: 'PASSED',
          completedAt: new Date(),
        },
      });

      await prisma.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: questions[0].id,
          isCorrect: true,
          pointsEarned: 1,
        },
      });

      await prisma.certificate.create({
        data: {
          userId: employees[0].id,
          courseId: course.id,
          certificateNumber: `CERT-2026-${String(ci + 1).padStart(6, '0')}-${index}`,
          score: 87,
        },
      });

      await prisma.notification.create({
        data: {
          userId: employees[0].id,
          title: 'Certificate issued',
          message: `You earned a certificate for ${title}`,
          type: 'CERTIFICATE_ISSUED',
        },
      });
    }

    // Assignment on the 3rd course.
    if (ci === 2) {
      const assignment = await prisma.assignment.create({
        data: { courseId: course.id, title: `${title} - Reflection Assignment`, maxScore: 100 },
      });
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          userId: employees[1].id,
          answer: 'My reflection...',
          score: 90,
          status: 'REVIEWED',
          gradedById: instructors[0].id,
          gradedAt: new Date(),
        },
      });
    }
  }

  const learningPath = await prisma.learningPath.create({
    data: { companyId: company.id, title: 'New Employee Onboarding', status: 'PUBLISHED' },
  });
  await Promise.all(
    courses.slice(0, 3).map((course, i) =>
      prisma.learningPathCourse.create({
        data: { learningPathId: learningPath.id, courseId: course.id, order: i + 1 },
      })
    )
  );

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      action: 'CREATE',
      entity: 'COURSE',
      entityId: courses[0].id,
      metadata: { courseTitle: courses[0].title },
    },
  });

  return { company, admin, instructors, employees, courses };
}

async function main() {
  console.log('Seeding roles...');
  const roleNames = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'EMPLOYEE'];
  const roleEntities = {};
  for (const name of roleNames) {
    roleEntities[name] = await prisma.role.upsert({
      where: { name },
      create: { name, description: `${name} role` },
      update: { description: `${name} role` },
    });
  }

  console.log('Seeding super admin...');
  const superAdminPassword = await argon2.hash(DEV_PASSWORD);
  await prisma.user.create({
    data: {
      roleId: roleEntities.SUPER_ADMIN.id,
      name: 'Platform Super Admin',
      email: 'superadmin@lms.dev',
      password: superAdminPassword,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Seeding Company A...');
  await seedCompany(roleEntities, 0);

  console.log('Seeding Company B...');
  await seedCompany(roleEntities, 1);

  console.log('Seed complete.');
  console.log(`All seeded accounts use the password: ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
