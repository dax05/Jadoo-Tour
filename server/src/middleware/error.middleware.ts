import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const rawMsg = err instanceof Error ? err.message : 'Internal Server Error';
  console.error(`[Server Error] ${req.method} ${req.url}:`, err);

  // Sanitize internal database errors to avoid leaking table/column/schema details
  const isSqlLeak = /relation|column|syntax error|pg_|foreign key|violates|select|insert|update|delete/i.test(rawMsg);
  const clientMsg = isSqlLeak
    ? 'A database error occurred while processing your request. Please try again later.'
    : rawMsg;

  res.status(500).json({
    success: false,
    message: clientMsg,
  });
}
