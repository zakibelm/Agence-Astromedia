// src/routes/webhooks.ts — Blotato webhook callbacks.
// Body is parsed by express.raw() upstream so HMAC sees the exact bytes Blotato sent.
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { BlotatoWebhookPayload } from '../types';
import {
  getCampaignByBlotatoJobId,
  updateCampaignByKey,
} from '../db/campaignRepo';
import { logger } from '../lib/logger';

export const webhookRouter = Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';
const ALLOW_UNSIGNED = process.env.NODE_ENV !== 'production';

if (!WEBHOOK_SECRET) {
  logger.warn(
    { allowUnsigned: ALLOW_UNSIGNED },
    'WEBHOOK_SECRET is not set — signatures will ' +
      (ALLOW_UNSIGNED ? 'NOT be enforced (dev)' : 'be required (all webhooks rejected)'),
  );
}

const verifySignature = (rawBody: Buffer, signature: string): boolean => {
  if (!WEBHOOK_SECRET) return ALLOW_UNSIGNED;
  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

webhookRouter.post('/blotato', (req: Request, res: Response) => {
  const signature = (req.headers['x-blotato-signature'] as string | undefined) ?? '';
  // express.raw() leaves the body as a Buffer on req.body
  const rawBody: Buffer = req.body instanceof Buffer ? req.body : Buffer.from('');

  if (!rawBody.length || !verifySignature(rawBody, signature)) {
    logger.warn({ requestId: req.requestId }, 'Invalid or missing Blotato webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload: BlotatoWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  logger.info(
    { requestId: req.requestId, blotatoId: payload.id, status: payload.status },
    'Blotato webhook received',
  );

  // Acknowledge fast — do DB work async to keep the webhook responsive
  res.status(200).json({ received: true });

  (async () => {
    const campaign = await getCampaignByBlotatoJobId(payload.id);
    if (!campaign) {
      logger.warn({ blotatoId: payload.id }, 'No campaign found for Blotato job');
      return;
    }

    if (payload.status === 'completed' && payload.media_url) {
      await updateCampaignByKey(campaign.idempotencyKey, {
        mediaUrl: payload.media_url,
        status: 'VALIDATION',
      });
      logger.info({ campaignId: campaign.id }, 'Media ready via webhook');
    } else if (payload.status === 'failed') {
      await updateCampaignByKey(campaign.idempotencyKey, {
        status: 'FAILED',
        error: payload.error ?? 'Blotato generation failed',
      });
      logger.error({ campaignId: campaign.id, error: payload.error }, 'Blotato failed');
    }
  })().catch((err) =>
    logger.error({ err, blotatoId: payload.id }, 'Async webhook DB update failed'),
  );
});
