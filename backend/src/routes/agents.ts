// src/routes/agents.ts — Proxy endpoints for the LLM agents.
// Frontend calls these instead of OpenRouter directly, so secrets stay server-side.
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  orchestrate,
  market,
  direct,
  validate,
  describe,
} from '../agents/openRouter';
import { requireProxyKey } from '../middleware/auth';
import { requireSupabaseJWT } from '../middleware/jwtAuth';

export const agentRouter = Router();
// Defense in depth: proxy key (anti-bot) + Supabase JWT (per-user auth)
agentRouter.use(requireProxyKey, requireSupabaseJWT);

const DEFAULT_TEXT_MODEL = process.env.DEFAULT_TEXT_MODEL ?? 'google/gemini-2.0-flash-001';

// ─── Schemas ─────────────────────────────────────────────────────────────────
const OrchestrateSchema = z.object({
  prompt: z.string().min(1),
  platform: z.string().min(1),
  textModel: z.string().default(DEFAULT_TEXT_MODEL),
  orchestratorPersona: z.string().min(1),
  brandContext: z.string().optional(),
  productImagesBase64: z.array(z.string()).optional(),
  logoBase64: z.string().optional(),
});

const MarketSchema = z.object({
  prompt: z.string().min(1),
  orchestratorVision: z.string().min(1),
  platform: z.string().min(1),
  textModel: z.string().default(DEFAULT_TEXT_MODEL),
  marketerPersona: z.string().min(1),
  brandContext: z.string().optional(),
  productImagesBase64: z.array(z.string()).optional(),
  logoBase64: z.string().optional(),
});

const DirectSchema = z.object({
  marketingCopy: z.string().min(1),
  orchestratorVision: z.string().min(1),
  platform: z.string().min(1),
  textModel: z.string().default(DEFAULT_TEXT_MODEL),
  directorPersona: z.string().min(1),
  brandContext: z.string().optional(),
});

const ValidateSchema = z.object({
  mediaUrl: z.string().url(),
  marketingCopy: z.string().min(1),
  textModel: z.string().default(DEFAULT_TEXT_MODEL),
  brandContext: z.string().optional(),
});

const DescribeSchema = z.object({
  imagesBase64: z.array(z.string()).min(1),
  prompt: z.string().min(1),
  textModel: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const handle = <S extends z.ZodTypeAny>(
  schema: S,
  fn: (input: z.infer<S>) => Promise<unknown>,
) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  fn(parsed.data)
    .then((out) => res.json(out))
    .catch(next);
};

// ─── Routes ──────────────────────────────────────────────────────────────────
agentRouter.post('/orchestrate', handle(OrchestrateSchema, orchestrate));
agentRouter.post('/market',      handle(MarketSchema,      market));
agentRouter.post('/direct',      handle(DirectSchema,      direct));
agentRouter.post('/validate',    handle(ValidateSchema,    validate));
agentRouter.post('/describe',    handle(DescribeSchema,    async (p) => ({ description: await describe(p) })));
