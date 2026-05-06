// src/middleware/rateLimit.ts — sensible defaults per endpoint family.
import rateLimit from 'express-rate-limit';

// Per-IP global guard against bots scraping.
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300, // 5 req/s sustained
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Heavier endpoints (LLM/Blotato fan-out) — tighter cap per IP.
export const llmLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer authenticated user id when available; fall back to IP.
    const user = (req as any).user?.id;
    return user || req.ip || 'unknown';
  },
});
