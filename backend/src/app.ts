// src/app.ts — Express application factory.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { campaignRouter } from './routes/campaigns';
import { webhookRouter } from './routes/webhooks';
import { agentRouter } from './routes/agents';
import { mediaRouter } from './routes/media';
import { healthRouter } from './routes/health';

import { correlationId } from './middleware/correlationId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter, llmLimiter } from './middleware/rateLimit';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // honor X-Forwarded-For when behind a load balancer

  // ── Security ─────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // SPA served separately; let nginx/Vercel set CSP
  }));

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());

  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-astromedia-key', 'x-request-id'],
  }));

  // ── Observability ────────────────────────────────────────────
  app.use(correlationId);
  app.use(requestLogger);

  // ── Body parsers ─────────────────────────────────────────────
  // Webhook routes need the *raw* body (HMAC verification depends on byte-exact bytes).
  app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json', limit: '2mb' }),
  );
  // All other routes: JSON, with extra room for image-vision base64 payloads.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/webhooks')) return next();
    return express.json({ limit: '20mb' })(req, res, next);
  });

  // ── Rate limiting ────────────────────────────────────────────
  app.use(globalLimiter);

  // ── Routes ───────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/api/agents', llmLimiter, agentRouter);
  app.use('/api/media', llmLimiter, mediaRouter);
  app.use('/api/campaigns', campaignRouter);
  app.use('/api/webhooks', webhookRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
