// src/middleware/jwtAuth.ts — Validate Supabase Auth JWT and attach req.user.
//
// Modern Supabase projects sign tokens with asymmetric keys (ES256/RS256),
// exposed via JWKS at <SUPABASE_URL>/auth/v1/.well-known/jwks.json.
//
// During migration from the legacy HS256 scheme, both signing methods can be
// active for ~1h (the lifetime of the last HS256-issued token). We therefore
// try JWKS first, then fall back to the legacy HS256 secret if provided.
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { logger } from '../lib/logger';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const LEGACY_HS256_SECRET = process.env.SUPABASE_JWT_SECRET ?? '';

const issuer = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined;
const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;

const legacySecretBytes = LEGACY_HS256_SECRET
  ? new TextEncoder().encode(LEGACY_HS256_SECRET)
  : null;

if (!JWKS && !legacySecretBytes) {
  logger.warn(
    'Neither SUPABASE_URL (for JWKS) nor SUPABASE_JWT_SECRET (legacy HS256) is set — JWT-protected routes will reject all requests',
  );
}

export interface AuthenticatedUser {
  id: string;       // Supabase auth.users.id (UUID)
  email?: string;
  role?: string;    // 'authenticated', 'service_role', etc.
  raw: JWTPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const verifyToken = async (token: string): Promise<JWTPayload> => {
  // 1. Asymmetric verification via JWKS (preferred)
  if (JWKS) {
    try {
      const opts: Parameters<typeof jwtVerify>[2] = { audience: 'authenticated' };
      if (issuer) opts.issuer = issuer;
      const { payload } = await jwtVerify(token, JWKS, opts);
      return payload;
    } catch (jwksErr: any) {
      // If we have a legacy fallback configured, try it; otherwise re-throw.
      if (!legacySecretBytes) throw jwksErr;
      logger.debug({ err: jwksErr.code }, 'JWKS verification failed, trying legacy HS256');
    }
  }

  // 2. Legacy HS256 fallback (only used during the migration window)
  if (legacySecretBytes) {
    const opts: Parameters<typeof jwtVerify>[2] = { algorithms: ['HS256'] };
    if (issuer) opts.issuer = issuer;
    const { payload } = await jwtVerify(token, legacySecretBytes, opts);
    return payload;
  }

  throw new Error('No JWT verification method configured');
};

export const requireSupabaseJWT = (req: Request, res: Response, next: NextFunction) => {
  if (!JWKS && !legacySecretBytes) {
    return res.status(500).json({ error: 'Server misconfigured: no Supabase JWT verifier available' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = header.slice('Bearer '.length).trim();

  verifyToken(token)
    .then((payload) => {
      if (!payload.sub) {
        return res.status(401).json({ error: 'Invalid token: missing sub' });
      }
      req.user = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof payload.role === 'string' ? payload.role : undefined,
        raw: payload,
      };
      next();
    })
    .catch((err: any) => {
      logger.warn({ err: err.code ?? err.message }, 'JWT rejected');
      return res.status(401).json({ error: 'Invalid or expired token' });
    });
};
