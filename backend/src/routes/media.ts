// src/routes/media.ts — Proxy endpoints for Blotato media operations.
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateMedia, publishMedia, scheduleMedia } from '../agents/blotato';
import { requireProxyKey } from '../middleware/auth';
import { requireSupabaseJWT } from '../middleware/jwtAuth';

export const mediaRouter = Router();
mediaRouter.use(requireProxyKey, requireSupabaseJWT);

const TemplateMappingSchema = z.object({
  templateId: z.string(),
  format: z.enum(['video', 'image']),
  variables: z.record(z.string()),
});

const GenerateSchema = z.object({
  templateMapping: TemplateMappingSchema,
});

const PublishSchema = z.object({
  copy: z.string().min(1),
  mediaUrl: z.string().url(),
  platform: z.string().min(1),
});

const ScheduleSchema = z.object({
  copy: z.string().min(1),
  mediaUrl: z.string().url(),
  platform: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

mediaRouter.post('/generate', (req: Request, res: Response, next: NextFunction) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  generateMedia(parsed.data.templateMapping)
    .then((out) => res.json(out))
    .catch(next);
});

mediaRouter.post('/publish', (req: Request, res: Response, next: NextFunction) => {
  const parsed = PublishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { copy, mediaUrl, platform } = parsed.data;
  publishMedia(copy, mediaUrl, platform)
    .then((out) => res.json(out))
    .catch(next);
});

mediaRouter.post('/schedule', (req: Request, res: Response, next: NextFunction) => {
  const parsed = ScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { copy, mediaUrl, platform, scheduledAt } = parsed.data;
  scheduleMedia(copy, mediaUrl, platform, scheduledAt)
    .then((out) => res.json(out))
    .catch(next);
});
