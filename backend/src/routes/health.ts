// src/routes/health.ts — liveness vs readiness checks.
//   - GET /health           → liveness (process up)
//   - GET /health/ready     → readiness (process up + Redis + DB reachable)
import { Router, Request, Response } from 'express';
import { redisConnection } from '../redis';
import { prisma } from '../db/prisma';
import { logger } from '../lib/logger';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'astromedia-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // Redis
  const r0 = Date.now();
  try {
    await redisConnection.ping();
    checks.redis = { ok: true, latencyMs: Date.now() - r0 };
  } catch (err: any) {
    checks.redis = { ok: false, error: err.message };
  }

  // Postgres
  const p0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = { ok: true, latencyMs: Date.now() - p0 };
  } catch (err: any) {
    checks.postgres = { ok: false, error: err.message };
  }

  const ready = Object.values(checks).every((c) => c.ok);
  if (!ready) {
    logger.warn({ checks }, 'Readiness check failed');
  }
  res.status(ready ? 200 : 503).json({ ready, checks });
});
