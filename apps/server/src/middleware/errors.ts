import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Map common Postgres / PostgREST error codes to sensible HTTP statuses so
// handlers can simply `throw error` from a Supabase call and still produce a
// meaningful response. Routes that need a custom message for a code (e.g. a
// friendlier unique-violation message) handle it before throwing.
const PG_ERROR_STATUS: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'That record already exists' },
  '23503': { status: 400, message: 'Referenced record does not exist' },
  '23502': { status: 400, message: 'A required field is missing' },
  '22P02': { status: 400, message: 'Invalid identifier' },
  // PostgREST: `.single()` matched zero rows.
  PGRST116: { status: 404, message: 'Not found' },
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Supabase errors are plain objects carrying a `code`, not Error instances.
  const code = (err as { code?: string } | null)?.code;
  if (code && PG_ERROR_STATUS[code]) {
    const { status, message } = PG_ERROR_STATUS[code];
    res.status(status).json({ error: message });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
