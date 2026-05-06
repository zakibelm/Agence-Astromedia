// src/queue.ts — BullMQ queue + job management
import { Queue } from 'bullmq';
import { redisConnection } from './redis';
import { CampaignJobData } from './types';
import { logger } from './lib/logger';

export const CAMPAIGN_QUEUE_NAME = 'astromedia:campaigns';

export const campaignQueue = new Queue<CampaignJobData>(CAMPAIGN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,                         // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,                       // Start retry at 2s, double each time
    },
    removeOnComplete: { count: 100 },    // Keep last 100 completed jobs
    removeOnFail: { count: 200 },        // Keep last 200 failed jobs for debug
  },
});

/**
 * Add a campaign job to the queue.
 * Uses idempotencyKey as the BullMQ jobId to prevent duplicate processing.
 */
export const enqueueCampaign = async (data: CampaignJobData): Promise<string> => {
  const job = await campaignQueue.add('produce-campaign', data, {
    jobId: data.idempotencyKey,          // Idempotent: same key = same job, no duplicate
    priority: data.priority ?? 5,       // Default mid priority
  });

  logger.info({ jobId: job.id, tenantId: data.tenantId }, 'Campaign enqueued');
  return job.id!;
};

/**
 * Get the current status + result of a job by its idempotency key.
 */
export const getCampaignJobStatus = async (idempotencyKey: string) => {
  const job = await campaignQueue.getJob(idempotencyKey);
  if (!job) return null;

  const state = await job.getState();
  return {
    jobId: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue,
    error: job.failedReason,
    createdAt: new Date(job.timestamp).toISOString(),
  };
};
