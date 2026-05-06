// src/routes/campaigns.ts — Campaign REST API endpoints
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { enqueueCampaign, getCampaignJobStatus } from '../queue';
import { CampaignJobData } from '../types';
import { requireProxyKey } from '../middleware/auth';
import { requireSupabaseJWT } from '../middleware/jwtAuth';
import { upsertCampaign, getCampaignByIdempotencyKey, ensureTenant } from '../db/campaignRepo';

export const campaignRouter = Router();
campaignRouter.use(requireProxyKey, requireSupabaseJWT);

const CreateCampaignSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'twitter']),
  textModel: z.string().default('google/gemini-2.0-flash-001'),
  orchestratorPersona: z.string().default('Senior Creative Director at a top ad agency'),
  marketerPersona: z.string().default('Performance marketer specialist in viral social ads'),
  directorPersona: z.string().default('Award-winning visual director specializing in short-form video'),
  priority: z.number().min(1).max(10).optional(),
  scheduledAt: z.string().optional(),
});

const sha256 = (input: string) => crypto.createHash('sha256').update(input).digest('hex');

// ── POST /api/campaigns ──────────────────────────────────────────
campaignRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  const parsed = CreateCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Tenant comes from the verified JWT — never from the request body
  const tenantId = req.user!.id;

  // Idempotency: hash the full prompt (not just first 32 chars of base64)
  const idempotencyKey = `campaign:${tenantId}:${sha256(parsed.data.prompt).slice(0, 24)}`;

  const jobData: CampaignJobData = {
    ...parsed.data,
    jobId: uuidv4(),
    idempotencyKey,
    tenantId,
    // API keys are read from env on the worker — no longer transmitted per-job
  };

  (async () => {
    await ensureTenant(tenantId, req.user?.email);
    await upsertCampaign({
      idempotencyKey,
      tenantId,
      prompt: parsed.data.prompt,
      platform: parsed.data.platform,
      priority: parsed.data.priority ?? 5,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    });
    const queuedJobId = await enqueueCampaign(jobData);
    res.status(202).json({
      message: 'Campaign enqueued successfully',
      jobId: queuedJobId,
      idempotencyKey,
      statusUrl: `/api/campaigns/${idempotencyKey}/status`,
    });
  })().catch(next);
});

// ── GET /api/campaigns/:key/status ──────────────────────────────
campaignRouter.get('/:key/status', (req: Request, res: Response, next: NextFunction) => {
  const { key } = req.params;

  (async () => {
    // Read from DB first — single source of truth even after BullMQ retention expires
    const persisted = await getCampaignByIdempotencyKey(key);

    // Tenant isolation: a user can only read their own campaigns
    if (persisted && persisted.tenantId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const queueStatus = await getCampaignJobStatus(key);

    if (!persisted && !queueStatus) {
      return res.status(404).json({ error: 'Job not found', key });
    }

    res.json({
      idempotencyKey: key,
      persisted: persisted ?? null,
      queue: queueStatus ?? null,
    });
  })().catch(next);
});
