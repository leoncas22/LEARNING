import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { DEFAULT_LEVELS } from './competency.service.js';
import { logActivity } from '../utils/activityLog.js';

const LEVEL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

/**
 * Calculates level from score using competency's configured level bands,
 * falling back to DEFAULT_LEVELS.
 */
export function calculateLevelFromScore(score, levelConfigs = []) {
  const configs = levelConfigs && levelConfigs.length > 0 ? levelConfigs : DEFAULT_LEVELS;
  const sorted = [...configs].sort((a, b) => a.minScore - b.minScore);

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (score >= sorted[i].minScore) {
      return sorted[i].level;
    }
  }

  return sorted[0]?.level || 'BEGINNER';
}

/**
 * Determines progress to next level.
 */
export function calculateNextLevelProgress(currentScore, levelConfigs = []) {
  const configs = levelConfigs && levelConfigs.length > 0 ? levelConfigs : DEFAULT_LEVELS;
  const sorted = [...configs].sort((a, b) => a.minScore - b.minScore);

  const currentLevelIndex = sorted.findIndex((c) => currentScore >= c.minScore && currentScore <= c.maxScore);

  if (sorted.length === 0) {
    return { currentLevel: 'BEGINNER', nextLevel: null, scoreNeeded: 0, percentageToNext: 100 };
  }

  // Scores below the first configured band are still at the first level;
  // they must not be reported as the highest level.
  const currentIndex = currentLevelIndex === -1 ? 0 : currentLevelIndex;
  if (currentIndex >= sorted.length - 1) {
    const highest = sorted[sorted.length - 1];
    return {
      currentLevel: highest.level,
      nextLevel: null,
      scoreNeeded: 0,
      percentageToNext: 100,
    };
  }

  const currentConfig = sorted[currentIndex];
  const nextConfig = sorted[currentIndex + 1];
  const scoreNeeded = Math.max(0, nextConfig.minScore - currentScore);
  const range = Math.max(1, nextConfig.minScore - currentConfig.minScore);
  const percentageToNext = Math.min(100, Math.max(0, Math.round(((currentScore - currentConfig.minScore) / range) * 100)));

  return {
    currentLevel: currentConfig.level,
    nextLevel: nextConfig.level,
    scoreNeeded,
    nextLevelMinScore: nextConfig.minScore,
    percentageToNext,
  };
}

/**
 * Server-side evaluation and persistence of employee competency achievement.
 * Invoked when an employee completes a course or passes a quiz.
 * Runs inside caller's transaction if provided.
 */
export async function recalculateEmployeeCompetenciesForCourse(userId, courseId, client = prisma) {
  // Find all competencies assigned to this course
  const courseCompetencies = await client.courseCompetency.findMany({
    where: { courseId },
    include: {
      competency: {
        include: {
          levels: { orderBy: { minScore: 'asc' } },
        },
      },
    },
  });

  if (courseCompetencies.length === 0) return [];

  // Check user's performance on this course:
  // 1. Enrollment status must be COMPLETED
  const enrollment = await client.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment || enrollment.status !== 'COMPLETED') {
    return [];
  }

  // 2. Check if course has a quiz and find best passed attempt score
  const quizAttempts = await client.quizAttempt.findMany({
    where: {
      userId,
      quiz: { courseId },
      status: { in: ['GRADED', 'PASSED'] },
    },
    orderBy: { score: 'desc' },
  });

  const bestQuizScore = quizAttempts.length > 0 && quizAttempts[0].score !== null
    ? quizAttempts[0].score
    : 100; // If no quiz, completion implies 100% course fulfillment

  const updatedRecords = [];

  for (const cc of courseCompetencies) {
    const comp = cc.competency;
    if (comp.status !== 'ACTIVE') continue;

    const achievedScore = Math.min(100, Math.max(0, bestQuizScore));
    const calculatedLevel = calculateLevelFromScore(achievedScore, comp.levels);

    // Bound calculated level to targetLevel ceiling if specified
    const targetIdx = LEVEL_ORDER.indexOf(cc.targetLevel);
    const calcIdx = LEVEL_ORDER.indexOf(calculatedLevel);
    const finalLevel = (targetIdx !== -1 && calcIdx > targetIdx) ? cc.targetLevel : calculatedLevel;

    // Check existing record
    const existing = await client.employeeCompetency.findUnique({
      where: {
        userId_competencyId: {
          userId,
          competencyId: comp.id,
        },
      },
    });

    // Only update if higher level or higher score in same level
    let shouldUpdate = true;
    if (existing) {
      const existingLevelIdx = LEVEL_ORDER.indexOf(existing.level);
      const newLevelIdx = LEVEL_ORDER.indexOf(finalLevel);

      if (existingLevelIdx > newLevelIdx) {
        shouldUpdate = false;
      } else if (existingLevelIdx === newLevelIdx && existing.score >= achievedScore) {
        shouldUpdate = false;
      }
    }

    if (shouldUpdate) {
      const record = await client.employeeCompetency.upsert({
        where: {
          userId_competencyId: {
            userId,
            competencyId: comp.id,
          },
        },
        create: {
          userId,
          competencyId: comp.id,
          level: finalLevel,
          score: achievedScore,
          source: 'COURSE',
          sourceId: courseId,
        },
        update: {
          level: finalLevel,
          score: achievedScore,
          source: 'COURSE',
          sourceId: courseId,
          achievedAt: new Date(),
        },
      });

      await logActivity(client, {
        userId,
        action: 'COMPETENCY_UPDATED',
        entity: 'EMPLOYEE_COMPETENCY',
        entityId: record.id,
        metadata: {
          competencyId: comp.id,
          competencyName: comp.name,
          level: finalLevel,
          score: achievedScore,
          source: 'COURSE',
          courseId,
        },
      });

      updatedRecords.push(record);
    }
  }

  return updatedRecords;
}

/**
 * Returns list of competencies earned by the authenticated employee.
 */
export async function getMyCompetencies(actingUser) {
  const records = await prisma.employeeCompetency.findMany({
    where: { userId: actingUser.id },
    include: {
      competency: {
        include: {
          levels: { orderBy: { minScore: 'asc' } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return records.map((r) => {
    const nextInfo = calculateNextLevelProgress(r.score, r.competency.levels);
    return {
      id: r.id,
      competencyId: r.competencyId,
      name: r.competency.name,
      category: r.competency.category,
      description: r.competency.description,
      level: r.level,
      score: r.score,
      achievedAt: r.achievedAt,
      updatedAt: r.updatedAt,
      nextLevel: nextInfo.nextLevel,
      scoreNeeded: nextInfo.scoreNeeded,
    };
  });
}

/**
 * Returns detail for a single competency for the authenticated employee,
 * including progress to next level and completed courses that contributed.
 */
export async function getMyCompetencyDetail(actingUser, competencyId) {
  const competency = await prisma.competency.findUnique({
    where: { id: competencyId },
    include: {
      levels: { orderBy: { minScore: 'asc' } },
      courseCompetencies: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              category: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  if (!competency) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }

  // Tenant check
  if (competency.companyId !== actingUser.companyId) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }

  const achievement = await prisma.employeeCompetency.findUnique({
    where: {
      userId_competencyId: {
        userId: actingUser.id,
        competencyId,
      },
    },
  });

  const nextInfo = calculateNextLevelProgress(achievement ? achievement.score : 0, competency.levels);

  // Find which contributing courses the user actually completed
  const contributingCourseIds = competency.courseCompetencies.map((cc) => cc.courseId);
  const completedEnrollments = await prisma.enrollment.findMany({
    where: {
      userId: actingUser.id,
      courseId: { in: contributingCourseIds },
      status: 'COMPLETED',
    },
    select: { courseId: true, completedAt: true },
  });

  const completedSet = new Map(completedEnrollments.map((e) => [e.courseId, e.completedAt]));

  const completedSources = competency.courseCompetencies
    .filter((cc) => completedSet.has(cc.courseId))
    .map((cc) => ({
      courseId: cc.course.id,
      courseTitle: cc.course.title,
      category: cc.course.category,
      difficulty: cc.course.difficulty,
      completedAt: completedSet.get(cc.courseId),
      targetLevel: cc.targetLevel,
    }));

  return {
    competency: {
      id: competency.id,
      name: competency.name,
      description: competency.description,
      category: competency.category,
      levels: competency.levels,
    },
    achievement: achievement
      ? {
          level: achievement.level,
          score: achievement.score,
          achievedAt: achievement.achievedAt,
          updatedAt: achievement.updatedAt,
        }
      : null,
    progress: nextInfo,
    completedSources,
  };
}

export default {
  calculateLevelFromScore,
  calculateNextLevelProgress,
  recalculateEmployeeCompetenciesForCourse,
  getMyCompetencies,
  getMyCompetencyDetail,
};

