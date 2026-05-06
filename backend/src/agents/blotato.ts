// src/agents/blotato.ts — Blotato media generation with retry + fallback
import { TemplateMapping } from '../types';
import { logger } from '../lib/logger';

const BLOTATO_API_URL = process.env.BLOTATO_API_URL ?? 'https://backend.blotato.com/v2';
const VIDEO_MODEL = process.env.BLOTATO_VIDEO_MODEL ?? 'kwaivgi/kling-v3.0-pro';
const VIDEO_MODEL_FALLBACK = process.env.BLOTATO_VIDEO_MODEL_FALLBACK ?? 'minimax/hailuo-2.3';
const MAX_POLL_ATTEMPTS = 60; // 60s timeout for async generation

const log = (step: string, status: string, msg?: string) =>
  logger.info({ component: 'blotato', step, status: status.toUpperCase() }, msg ?? '');

const getKey = (override?: string): string => {
  const key = override || process.env.BLOTATO_API_KEY;
  if (!key) throw new Error('Blotato API key missing (set BLOTATO_API_KEY in env)');
  return key;
};

const blotatoFetch = async <T = any>(
  path: string,
  apiKey: string,
  method = 'POST',
  body?: object,
): Promise<T> => {
  const res = await fetch(`${BLOTATO_API_URL}${path}`, {
    method,
    headers: { 'blotato-api-key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error(`Blotato [${res.status}]: ${await res.text()}`);
  return (await res.json()) as T;
};

interface BlotatoJobStatus { status: 'processing' | 'completed' | 'failed'; url?: string; error?: string }
interface BlotatoCreateResponse { id: string }
interface BlotatoPostResponse { id: string }

/**
 * Poll Blotato until job completes or timeout is reached.
 * Timeout: MAX_POLL_ATTEMPTS × 1s = 60s
 */
const pollGeneration = async (jobId: string, apiKey: string): Promise<string> => {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const check = await blotatoFetch<BlotatoJobStatus>(`/videos/${jobId}`, apiKey, 'GET');

    if (check.status === 'completed' && check.url) return check.url;
    if (check.status === 'failed') throw new Error(`Blotato job ${jobId} failed: ${check.error}`);
  }
  throw new Error(`Blotato generation timeout after ${MAX_POLL_ATTEMPTS}s`);
};

/**
 * Generate media with retry (x3) + model fallback.
 */
export const generateMedia = async (
  templateMapping: TemplateMapping,
  blotatoApiKey?: string,
  retries = 3,
  useFallbackModel = false
): Promise<{ url: string; fallbackUsed: boolean }> => {
  const apiKey = getKey(blotatoApiKey);
  const model = useFallbackModel ? VIDEO_MODEL_FALLBACK : VIDEO_MODEL;
  log('MEDIA_GEN', 'info', `Starting with model=${model}, retries_left=${retries}`);

  try {
    const response = await blotatoFetch<BlotatoCreateResponse>(
      '/videos/from-templates',
      apiKey,
      'POST',
      {
        templateId: templateMapping.templateId,
        format: templateMapping.format,
        model,
        variables: templateMapping.variables,
      },
    );

    const url = await pollGeneration(response.id, apiKey);
    log('MEDIA_GEN', 'success', `Generated: ${url}`);
    return { url, fallbackUsed: useFallbackModel };

  } catch (error: any) {
    log('MEDIA_GEN', 'error', error.message);

    if (retries > 0) {
      log('MEDIA_GEN_RETRY', 'info', `Retrying. Remaining: ${retries - 1}`);
      return generateMedia(templateMapping, apiKey, retries - 1, useFallbackModel);
    }

    if (!useFallbackModel) {
      log('MEDIA_GEN_FALLBACK', 'info', `Switching to fallback model: ${VIDEO_MODEL_FALLBACK}`);
      return generateMedia(templateMapping, apiKey, 1, true);
    }

    log('MEDIA_GEN_FALLBACK', 'error', 'All retries and fallback exhausted.');
    throw new Error('Media generation failed after all retries and fallback.');
  }
};

export const publishMedia = async (
  copy: string,
  mediaUrl: string,
  platform: string,
  blotatoApiKey?: string
) => {
  const apiKey = getKey(blotatoApiKey);
  log('PUBLISH', 'info', `Publishing to ${platform}`);
  const response = await blotatoFetch<BlotatoPostResponse>('/posts', apiKey, 'POST', {
    content: copy,
    mediaUrls: [mediaUrl],
    platform,
  });
  log('PUBLISH', 'success', `Post ID: ${response.id}`);
  return { success: true, postId: response.id, platform, publishedAt: new Date().toISOString() };
};

export const scheduleMedia = async (
  copy: string,
  mediaUrl: string,
  platform: string,
  scheduledAt: string,
  blotatoApiKey?: string
) => {
  const apiKey = getKey(blotatoApiKey);
  log('SCHEDULE', 'info', `Scheduling on ${platform} at ${scheduledAt}`);
  const response = await blotatoFetch<BlotatoPostResponse>('/schedules', apiKey, 'POST', {
    content: copy,
    mediaUrls: [mediaUrl],
    platform,
    scheduledAt,
  });
  log('SCHEDULE', 'success', `Schedule ID: ${response.id}`);
  return { success: true, scheduleId: response.id, platform, scheduledAt };
};
