import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`LMS API listening on ${env.appUrl} [${env.nodeEnv}]`);
  for (const warning of env.startupWarnings) {
    // eslint-disable-next-line no-console
    console.warn(`[startup] ${warning}`);
  }
});

// Graceful shutdown
function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
