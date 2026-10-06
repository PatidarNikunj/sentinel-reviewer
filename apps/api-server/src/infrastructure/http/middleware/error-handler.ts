// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler Middleware
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  console.error(`❌ [${statusCode}] ${err.message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
