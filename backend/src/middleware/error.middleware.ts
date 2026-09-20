import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { SuppressedRecipientError } from '../services/email.service.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

  // 3. Malformed JSON Body (HTTP 400 Bad Request)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'The request body contains invalid JSON syntax.',
        statusCode: 400
      }
    });
    return;
  }

  // 4. Prisma Known Request Errors (Database level constraints & errors)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation (e.g. duplicate email)
        const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(', ') : 'field';
        res.status(409).json({
          error: {
            code: 'DUPLICATE_RESOURCE',
            message: `A record with this ${target} already exists.`,
            statusCode: 409,
            target
          }
        });
        return;
      }
      case 'P2025': {
        // Record not found
        res.status(404).json({
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found in the database.',
            statusCode: 404
          }
        });
        return;
      }
      case 'P2003': {
        // Foreign key constraint failure
        res.status(400).json({
          error: {
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'Referenced foreign key entity does not exist.',
            statusCode: 400,
            field: err.meta?.field_name
          }
        });
        return;
      }
      case 'P2000': {
        // Value too long
        res.status(400).json({
          error: {
            code: 'VALUE_TOO_LONG',
            message: 'Provided value exceeds the column length constraint.',
            statusCode: 400
          }
        });
        return;
      }
      default:
        break;
    }
  }

  // 5. Fallback Internal Server Error (HTTP 500)
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  console.error(`[UNHANDLED_ERROR] ${req.method} ${req.path} (${statusCode}):`, err);

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message,
      statusCode
    }
  });
}
