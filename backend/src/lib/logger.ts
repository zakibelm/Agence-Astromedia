// src/lib/logger.ts — central pino logger.
// Use logger.child({ requestId, jobId, tenantId }) to scope context.
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: {
    service: process.env.OTEL_SERVICE_NAME ?? 'astromedia-backend',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // Never log secrets, even by accident
    paths: [
      '*.password',
      '*.apiKey',
      '*.openRouterApiKey',
      '*.blotatoApiKey',
      '*.authorization',
      '*.Authorization',
      '*.x-astromedia-key',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-astromedia-key"]',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l' },
    },
  }),
});
