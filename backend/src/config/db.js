import { PrismaClient } from '@prisma/client';
import env from './env.js';

// Reuse a single PrismaClient across the app (and across hot-reloads in dev)
// instead of instantiating one per request/module import, which would
// otherwise exhaust the Postgres connection pool.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma__ ??
  new PrismaClient({
    log: env.isProduction ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.__prisma__ = prisma;
}

export default prisma;
