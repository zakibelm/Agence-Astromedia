// src/middleware/errorHandler.ts — structured error responses.
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isProd = process.env.NODE_ENV === 'production';
  logger.error(
    { err, requestId: req.requestId, path: req.path, method: req.method },
    'Unhandled error',
  );
  res.status(err.status ?? 500).json({
    error: err.expose === true ? err.message : 'Internal server error',
    requestId: req.requestId,
    ...(isProd ? {} : { details: err.message }),
  });
};
