// src/worker.ts — BullMQ Worker: executes the full agency pipeline.
// Each stage is persisted to Postgres so the campaign survives Redis eviction.
import 'dotenv/config';
import './tracing'; // Initialize OTel FIRST
import { Worker, Job } from 'bullmq';
import { redisConnection } from './redis';
import { CAMPAIGN_QUEUE_NAME } from './queue';
import { CampaignJobData, CampaignResult } from './types';
import {
  runOrchestrator,
  runMarketer,
  runDirector,
  runValidator,
} from './agents/openRouter';
import { generateMedia } from './agents/blotato';
import { updateCampaignByKey } from './db/campaignRepo';
import { prisma } from './db/prisma';
import { logger as rootLogger } from './lib/logger';

const persist = (key: string, patch: Parameters<typeof updateCampaignByKey>[1]) =>
  updateCampaignByKey(key, patch).catch((err) =>
    rootLogger.error({ err, key }, 'DB persist failed'),
  );

const processJob = async (job: Job<CampaignJobData>): Promise<CampaignResult> => {
  const { data } = job;
  const { idempotencyKey } = data;
  const startTime = Date.now();
  const result: CampaignResult = { jobId: data.jobId, status: 'ORCHESTRATING' };
  const log = rootLogger.child({
    jobId: job.id,
    idempotencyKey,
    tenantId: data.tenantId,
    platform: data.platform,
  });

  log.info('Starting job');

  try {
    // ── STAGE 1: Orchestrator ─────────────────────────────────────
    await job.updateProgress(10);
    await persist(idempotencyKey, { status: 'ORCHESTRATING' });
    const orchestration = await runOrchestrator(data);
    result.enhancedPrompt = orchestration.enhancedPrompt;
    result.strategy = orchestration.strategy;
    await persist(idempotencyKey, {
      enhancedPrompt: orchestration.enhancedPrompt,
      strategy: orchestration.strategy,
    });
    log.info({ strategy: orchestration.strategy }, 'Orchestrator done');

    // ── STAGE 2: Marketer ─────────────────────────────────────────
    await job.updateProgress(30);
    await persist(idempotencyKey, { status: 'MARKETING' });
    result.status = 'MARKETING';
    const { copy } = await runMarketer(data, orchestration.enhancedPrompt);
    result.marketingCopy = copy;
    await persist(idempotencyKey, { marketingCopy: copy });
    log.info({ copyLen: copy.length }, 'Marketer done');

    // ── STAGE 3: Director ─────────────────────────────────────────
    await job.updateProgress(50);
    await persist(idempotencyKey, { status: 'DIRECTING' });
    result.status = 'DIRECTING';
    const templateMapping = await runDirector(data, copy, orchestration.enhancedPrompt);
    result.templateMapping = templateMapping;
    await persist(idempotencyKey, { templateMapping });
    log.info({ templateId: templateMapping.templateId }, 'Director done');

    // ── STAGE 4: Media Generation (Blotato) ───────────────────────
    await job.updateProgress(65);
    await persist(idempotencyKey, { status: 'MEDIA_GEN' });
    result.status = 'MEDIA_GEN';
    const { url: mediaUrl, fallbackUsed } = await generateMedia(templateMapping);
    result.mediaUrl = mediaUrl;
    result.fallbackUsed = fallbackUsed;
    await persist(idempotencyKey, { mediaUrl, fallbackUsed });
    log.info({ mediaUrl, fallbackUsed }, 'Media generated');

    // ── STAGE 5: Validation (QA) ──────────────────────────────────
    await job.updateProgress(85);
    await persist(idempotencyKey, { status: 'VALIDATION' });
    result.status = 'VALIDATION';
    const validationResult = await runValidator(data, mediaUrl, copy);
    result.validationResult = validationResult;
    await persist(idempotencyKey, { validationResult });
    log.info({ passed: validationResult.passed }, 'Validation done');

    // ── STAGE 6: Decision ─────────────────────────────────────────
    await job.updateProgress(100);
    result.status = 'DECISION';
    result.durationMs = Date.now() - startTime;
    await persist(idempotencyKey, { status: 'DECISION', durationMs: result.durationMs });

    log.info({ durationMs: result.durationMs }, 'Job complete');
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    result.status = 'FAILED';
    result.error = err.message;
    result.durationMs = durationMs;
    await persist(idempotencyKey, {
      status: 'FAILED',
      error: err.message,
      durationMs,
    });
    log.error({ err }, 'Job failed');
    throw err; // BullMQ handles retry policy
  }
};

const worker = new Worker<CampaignJobData, CampaignResult>(CAMPAIGN_QUEUE_NAME, processJob, {
  connection: redisConnection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  limiter: {
    max: parseInt(process.env.WORKER_RATE_MAX ?? '10', 10),
    duration: parseInt(process.env.WORKER_RATE_DURATION_MS ?? '60000', 10),
  },
});

worker.on('completed', (job, r) =>
  rootLogger.info({ jobId: job.id, status: r.status }, 'Worker completed'),
);
worker.on('failed', (job, err) =>
  rootLogger.warn({ jobId: job?.id, err }, 'Worker job failed'),
);
worker.on('error', (err) => rootLogger.error({ err }, 'Worker error'));

rootLogger.info('Astromedia worker started');

// ── Graceful shutdown ────────────────────────────────────────────
const shutdownWorker = async (signal: string) => {
  rootLogger.info({ signal }, 'Worker shutdown initiated');
  try {
    // Stop accepting new jobs and wait for in-flight jobs to finish
    await worker.close();
    rootLogger.info('Worker drained');
  } catch (err) {
    rootLogger.error({ err }, 'Worker close failed');
  }
  try {
    await prisma.$disconnect();
  } catch {}
  try {
    await redisConnection.quit();
  } catch {}
  process.exit(0);
};

process.on('SIGTERM', () => shutdownWorker('SIGTERM'));
process.on('SIGINT', () => shutdownWorker('SIGINT'));
process.on('unhandledRejection', (reason) =>
  rootLogger.error({ err: reason }, 'Worker unhandled rejection'),
);
process.on('uncaughtException', (err) => {
  rootLogger.fatal({ err }, 'Worker uncaught exception — exiting');
  process.exit(1);
});
