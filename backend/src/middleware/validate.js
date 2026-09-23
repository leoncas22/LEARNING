import { ZodError } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validates { body, query, params } against a Zod schema and replaces
 * req.body/req.query/req.params with the parsed (coerced/defaulted)
 * result — so, e.g., a schema's z.coerce.number() on ?page=2 actually
 * reaches the controller as a number, not the original string.
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      req.body = parsed.body ?? req.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.reduce((acc, issue) => {
          const key = issue.path.slice(1).join('.') || issue.path.join('.') || 'value';
          acc[key] = issue.message;
          return acc;
        }, {});
        next(new AppError('Validation failed', 422, 'VALIDATION_ERROR', details));
        return;
      }
      next(err);
    }
  };
}
