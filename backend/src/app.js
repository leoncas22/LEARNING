import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';

import env from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Behind a reverse proxy (Vercel/Railway/Render) in production, so
// express-rate-limit and `secure` cookies see the real client IP/protocol.
if (env.isProduction) {
  app.set('trust proxy', 1);
}

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    // Never "*": the refresh-token cookie requires credentials: true, which
    // CORS forbids combining with a wildcard origin anyway. Single,
    // explicit origin from env for both dev and prod.
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Basic global rate limiter. Tighter, endpoint-specific limits (e.g. login)
// are added by the authentication middleware.
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Routes ---
// Uploaded files (local storage driver — see storage.service.js) are
// served directly, outside /api, matching the relative URL that upload
// returns (e.g. "/uploads/<file>").
if (env.storage.driver === 'local') {
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.storage.localUploadDir)));
}
app.use('/api', routes);

// --- 404 + error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
