import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { SuppressedRecipientError } from '../services/email.service.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // 1. Zod Validation Errors (HTTP 422 Unprocessable Entity)
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request payload failed schema validation.',
        statusCode: 422,
        issues: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          rule: e.code
        }))
      }
    });
    return;
  }

  // 2. Suppression Compliance Error (HTTP 409 Conflict)
  if (err instanceof SuppressedRecipientError) {
    res.status(409).json({
      error: {
        code: 'RECIPIENT_SUPPRESSED',
        message: err.message,
        statusCode: 409
      }
    });
    return;
  }

  // 3. Known HTTP error or fallback (HTTP 500 Internal Server Error)
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message,
      statusCode
    }
  });
}
