import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { logActivity } from '../utils/activityLog.js';

export const DEFAULT_LEVELS = [
  { level: 'BEGINNER', description: 'Foundational understanding and basic application', minScore: 0, maxScore: 59 },
  { level: 'INTERMEDIATE', description: 'Can apply concepts with minimal guidance', minScore: 60, maxScore: 74 },
  { level: 'ADVANCED', description: 'Can independently apply competency in complex scenarios', minScore: 75, maxScore: 89 },
  { level: 'EXPERT', description: 'Recognized authority capable of coaching and leading', minScore: 90, maxScore: 100 },
];

export async function listCompetencies(actingUser, query = {}) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['name', 'category', 'status', 'createdAt', 'updatedAt'],
    defaultSort: 'name',
  });

  const where = {
    companyId: actingUser.companyId,
  };

  if (query.category) {
    where.category = query.category;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, competencies] = await Promise.all([
    prisma.competency.count({ where }),
    prisma.competency.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        levels: {
          orderBy: { minScore: 'asc' },
        },
        _count: {
          select: {
            employeeCompetencies: true,
            courseCompetencies: true,
          },
        },
      },
    }),
  ]);

  const shaped = competencies.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    levels: c.levels,
    employeeCount: c._count.employeeCompetencies,
    courseCount: c._count.courseCompetencies,
  }));

  return {
    data: shaped,
    pagination: buildPaginationMeta({ page, limit, total }),
  };
}

export async function getCompetency(actingUser, id) {
  const competency = await prisma.competency.findUnique({
    where: { id },
    include: {
      levels: {
        orderBy: { minScore: 'asc' },
      },
      courseCompetencies: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              status: true,
            },
          },
        },
      },
      employeeCompetencies: {
        orderBy: { achievedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!competency) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }

  assertSameCompany(competency.companyId, actingUser);

  return competency;
}

export async function createCompetency(actingUser, data) {
  const levelsToCreate = data.levels && data.levels.length > 0 ? data.levels : DEFAULT_LEVELS;

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.competency.findUnique({
      where: {
        companyId_name: {
          companyId: actingUser.companyId,
          name: data.name.trim(),
        },
      },
    });

    if (existing) {
      throw new AppError('A competency with this name already exists in your company', 409, 'COMPETENCY_ALREADY_EXISTS');
    }

    const competency = await tx.competency.create({
      data: {
        companyId: actingUser.companyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
        status: data.status || 'ACTIVE',
        levels: {
          create: levelsToCreate.map((lvl) => ({
            level: lvl.level,
            description: lvl.description?.trim() || null,
            minScore: lvl.minScore,
            maxScore: lvl.maxScore,
          })),
        },
      },
      include: {
        levels: {
          orderBy: { minScore: 'asc' },
        },
      },
    });

    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'COMPETENCY_CREATED',
      entity: 'COMPETENCY',
      entityId: competency.id,
      metadata: { name: competency.name, category: competency.category },
    });

    return competency;
  });

  return created;
}

export async function updateCompetency(actingUser, id, data) {
  const existing = await prisma.competency.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(existing.companyId, actingUser);

  const updated = await prisma.$transaction(async (tx) => {
    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await tx.competency.findUnique({
        where: {
          companyId_name: {
            companyId: actingUser.companyId,
            name: data.name.trim(),
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new AppError('A competency with this name already exists', 409, 'DUPLICATE_NAME');
      }
    }

    if (data.levels && Array.isArray(data.levels)) {
      // Replace existing level configs
      await tx.competencyLevelConfig.deleteMany({
        where: { competencyId: id },
      });
      await tx.competencyLevelConfig.createMany({
        data: data.levels.map((lvl) => ({
          competencyId: id,
          level: lvl.level,
          description: lvl.description?.trim() || null,
          minScore: lvl.minScore,
          maxScore: lvl.maxScore,
        })),
      });
    }

    const comp = await tx.competency.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.category !== undefined && { category: data.category?.trim() || null }),
        ...(data.status && { status: data.status }),
      },
      include: {
        levels: {
          orderBy: { minScore: 'asc' },
        },
      },
    });

    await logActivity(tx, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'COMPETENCY_UPDATED',
      entity: 'COMPETENCY',
      entityId: id,
      metadata: { name: comp.name },
    });

    return comp;
  });

  return updated;
}

export async function archiveCompetency(actingUser, id) {
  const existing = await prisma.competency.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(existing.companyId, actingUser);

  const archived = await prisma.competency.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COMPETENCY_ARCHIVED',
    entity: 'COMPETENCY',
    entityId: id,
    metadata: { name: archived.name },
  });

  return archived;
}

export default {
  DEFAULT_LEVELS,
  listCompetencies,
  getCompetency,
  createCompetency,
  updateCompetency,
  archiveCompetency,
};

