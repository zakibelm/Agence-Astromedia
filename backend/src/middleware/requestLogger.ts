// src/middleware/requestLogger.ts — pino-http with the project logger.
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

export const requestLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    requestId: (req as any).requestId,
    tenantId: (req as any).user?.id,
  }),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Skip noisy health checks
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, requestId: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
