import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, '../..');
const envPath = path.join(backendRoot, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error && envResult.error.code !== 'ENOENT') {
  throw new Error(`Unable to read backend environment file: ${envPath}`);
}

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const startupWarnings = [];
const placeholderSecret = (value) => !value || /replace|example|placeholder|change.?me/i.test(value);
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (placeholderSecret(jwtAccessSecret)) {
  if (isProduction) throw new Error('JWT_ACCESS_SECRET must be configured with a strong, unique secret');
  startupWarnings.push('JWT_ACCESS_SECRET is unset or appears to be a placeholder; protected API requests will not authenticate.');
}
if (placeholderSecret(jwtRefreshSecret)) {
  if (isProduction) throw new Error('JWT_REFRESH_SECRET must be configured with a strong, unique secret');
  startupWarnings.push('JWT_REFRESH_SECRET is unset or appears to be a placeholder; refresh-token operations will not work.');
}

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateUrl(name, value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return value;
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(required('PORT', 5000)),
  appUrl: validateUrl('APP_URL', required('APP_URL', 'http://localhost:5000')),
  clientUrl: validateUrl('CLIENT_URL', required('CLIENT_URL', 'http://localhost:5173')),

  // Validate URL shape without connecting. Connection readiness is handled by
  // /api/health/db and never attempts a write during application startup.
  databaseUrl: (() => {
    const value = process.env.DATABASE_URL;
    if (!value) {
      startupWarnings.push('DATABASE_URL is not set; database-backed endpoints are unavailable until configured.');
      return undefined;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') throw new Error();
      return value;
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
    }
  })(),

  jwt: {
    accessSecret: jwtAccessSecret || '',
    refreshSecret: jwtRefreshSecret || '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localUploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 200),
  },

  startupWarnings,
  isProduction,
};

export default env;
