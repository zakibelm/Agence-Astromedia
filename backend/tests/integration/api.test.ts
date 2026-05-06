import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

// ─── Hoisted setup — runs BEFORE module imports load env-reading code ────────
const { PROXY_KEY, HS256_SECRET, TEST_USER_ID } = vi.hoisted(() => {
  const consts = {
    PROXY_KEY: 'test-proxy-key',
    HS256_SECRET: 'test-jwt-secret-very-long-enough-for-hs256',
    TEST_USER_ID: '11111111-1111-1111-1111-111111111111',
  };
  // Set env here so jwtAuth/auth modules read the right values at module-init time
  process.env.ASTROMEDIA_PROXY_KEY = consts.PROXY_KEY;
  process.env.SUPABASE_JWT_SECRET = consts.HS256_SECRET;
  // Set to '' (not delete) so dotenv.config doesn't repopulate from .env file
  process.env.SUPABASE_URL = '';
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  process.env.BLOTATO_API_KEY = 'blt_test';
  process.env.NODE_ENV = 'test';
  return consts;
});

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    status: 'ready',
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn(),
  }));
  return { default: Redis, Redis };
});

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id-123' }),
    getJob: vi.fn(),
  })),
  Worker: vi.fn(),
}));

vi.mock('../../src/queue', () => ({
  enqueueCampaign: vi.fn().mockResolvedValue('mock-job-id-123'),
  getCampaignJobStatus: vi.fn().mockResolvedValue({
    jobId: 'mock-job-id-123',
    state: 'completed',
    progress: 100,
    result: { status: 'DECISION', passed: true },
    error: null,
    createdAt: new Date().toISOString(),
  }),
}));

vi.mock('../../src/db/campaignRepo', () => ({
  ensureTenant: vi.fn().mockResolvedValue(undefined),
  upsertCampaign: vi.fn().mockResolvedValue({ id: 'camp-1' }),
  getCampaignByIdempotencyKey: vi.fn().mockResolvedValue({
    id: 'camp-1',
    idempotencyKey: 'campaign:any:abc',
    tenantId: TEST_USER_ID,
    status: 'COMPLETED',
  }),
  getCampaignByBlotatoJobId: vi.fn(),
  updateCampaignByKey: vi.fn(),
}));

vi.mock('../../src/db/prisma', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]), $disconnect: vi.fn() },
}));

import { createApp } from '../../src/app';

const app = createApp();

const buildJwt = async (sub = TEST_USER_ID) => {
  const secret = new TextEncoder().encode(HS256_SECRET);
  return new SignJWT({ sub, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
};

describe('POST /api/campaigns', () => {
  it('returns 202 with jobId when payload is valid + auth ok', async () => {
    const jwt = await buildJwt();
    const res = await request(app)
      .post('/api/campaigns')
      .set('x-astromedia-key', PROXY_KEY)
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        prompt: 'Launch a viral TikTok campaign for my sneakers',
        platform: 'tiktok',
      });

    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.statusUrl).toMatch(/\/api\/campaigns\/.+\/status/);
  });

  it('returns 401 without Authorization header', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('x-astromedia-key', PROXY_KEY)
      .send({ prompt: 'A valid prompt for testing', platform: 'tiktok' });
    expect(res.status).toBe(401);
  });

  it('returns 401 without proxy key', async () => {
    const jwt = await buildJwt();
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ prompt: 'A valid prompt for testing', platform: 'tiktok' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when prompt is too short', async () => {
    const jwt = await buildJwt();
    const res = await request(app)
      .post('/api/campaigns')
      .set('x-astromedia-key', PROXY_KEY)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ prompt: 'short', platform: 'tiktok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when platform is invalid', async () => {
    const jwt = await buildJwt();
    const res = await request(app)
      .post('/api/campaigns')
      .set('x-astromedia-key', PROXY_KEY)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ prompt: 'A valid campaign prompt for testing purposes', platform: 'myspace' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/campaigns/:key/status', () => {
  it('returns persisted+queue status for the owner', async () => {
    const jwt = await buildJwt();
    const res = await request(app)
      .get('/api/campaigns/campaign:tenant:abc123/status')
      .set('x-astromedia-key', PROXY_KEY)
      .set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(200);
    expect(res.body.queue.state).toBe('completed');
    expect(res.body.persisted).toBeDefined();
  });
});

describe('GET /health', () => {
  it('returns 200 with uptime (no auth required)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeGreaterThan(0);
  });
});
