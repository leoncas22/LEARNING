/**
 * Custom application error. Throw this from controllers/services with a
 * meaningful status code and machine-readable error code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler - must be registered after all routes.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Centralized error handler - must be registered last.
 * Every response follows the standard { success, message, data|error } shape.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';

  if (!err.isOperational) {
    // Unexpected/programmer error - log full detail server-side.
    // eslint-disable-next-line no-console
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong on our end.',
    error: errorCode,
    ...(err.details ? { details: err.details } : {}),
  });
}

/**
 * Wrap async route handlers so rejected promises reach errorHandler
 * instead of crashing the process.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
