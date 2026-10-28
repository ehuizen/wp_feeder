// Shared error responses for routes, all in the one { error: { code, message } } shape.
import type { Response } from 'express';
import { z } from 'zod';

export function sendValidationError(res: Response, error: z.ZodError): void {
  // Zod messages describe the rule, never the submitted value, so no password can end up here.
  res.status(400).json({
    error: {
      code: 'validation_error',
      message: 'Invalid input',
      fields: z.flattenError(error).fieldErrors,
    },
  });
}

export function sendNotFound(res: Response, what: string): void {
  res.status(404).json({ error: { code: 'not_found', message: `${what} not found` } });
}

// A non-uuid id can't exist, so routers 404 it without touching the database.
export const isUuid = (id: string): boolean => z.uuid().safeParse(id).success;
