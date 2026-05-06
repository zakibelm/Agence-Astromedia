// src/middleware/auth.ts — Shared-secret guard for proxy endpoints.
// Frontend sends `x-astromedia-key`; backend compares against ASTROMEDIA_PROXY_KEY.
// This is a transitional layer — replace with full Supabase/Clerk JWT in Session 2.
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const PROXY_KEY = process.env.ASTROMEDIA_PROXY_KEY ?? '';

if (!PROXY_KEY) {
  logger.warn('ASTROMEDIA_PROXY_KEY is not set — proxy endpoints will reject all requests');
}

export const requireProxyKey = (req: Request, res: Response, next: NextFunction) => {
  if (!PROXY_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: ASTROMEDIA_PROXY_KEY missing' });
  }

  const provided = req.headers['x-astromedia-key'];
  if (typeof provided !== 'string' || provided.length !== PROXY_KEY.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(provided);
  const b = Buffer.from(PROXY_KEY);
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
