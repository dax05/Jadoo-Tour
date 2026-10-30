import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const msg = err instanceof Error ? err.message : 'Internal Server Error';
  console.error(`[Server Error] ${req.method} ${req.url}:`, err);

  res.status(500).json({
    success: false,
    message: msg,
  });
}
