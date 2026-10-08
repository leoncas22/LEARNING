import { Router } from 'express';
import prisma from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/health
 * Liveness check - confirms the API process is up. Does not touch the DB.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS API is running',
    data: {
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/health/db
 * Readiness check - confirms the API can actually reach PostgreSQL through
 * Prisma. Added once the schema and migration were introduced.
 */
router.get(
  '/db',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      data: { timestamp: new Date().toISOString() },
    });
  })
);

export default router;
