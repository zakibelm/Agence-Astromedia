// src/db/campaignRepo.ts — Prisma queries for the Campaign + Tenant models.
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { CampaignStatus, TemplateMapping, ValidationResult } from '../types';

export const ensureTenant = async (tenantId: string, email?: string) => {
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      // slug must be unique — derive it from the supabase user id
      slug: tenantId.replace(/[^a-z0-9]/gi, '').slice(0, 24).toLowerCase() || tenantId,
      name: email ?? `tenant-${tenantId.slice(0, 8)}`,
    },
  });
};

interface UpsertInput {
  idempotencyKey: string;
  tenantId: string;
  prompt: string;
  platform: string;
  priority?: number;
  scheduledAt?: Date | null;
}

export const upsertCampaign = async (input: UpsertInput) => {
  return prisma.campaign.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {}, // existing campaign — don't overwrite progress
    create: {
      idempotencyKey: input.idempotencyKey,
      tenantId: input.tenantId,
      prompt: input.prompt,
      platform: input.platform,
      priority: input.priority ?? 5,
      scheduledAt: input.scheduledAt ?? null,
      status: 'PENDING',
    },
  });
};

interface StageUpdate {
  status?: CampaignStatus;
  enhancedPrompt?: string;
  strategy?: string;
  marketingCopy?: string;
  templateMapping?: TemplateMapping;
  mediaUrl?: string;
  blotatoJobId?: string;
  fallbackUsed?: boolean;
  validationResult?: ValidationResult;
  durationMs?: number;
  error?: string;
  publishedAt?: Date;
}

export const updateCampaignByKey = async (idempotencyKey: string, patch: StageUpdate) => {
  const data: Prisma.CampaignUpdateInput = {};
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.enhancedPrompt !== undefined) data.enhancedPrompt = patch.enhancedPrompt;
  if (patch.strategy !== undefined) data.strategy = patch.strategy;
  if (patch.marketingCopy !== undefined) data.marketingCopy = patch.marketingCopy;
  if (patch.templateMapping !== undefined) data.templateJson = patch.templateMapping as any;
  if (patch.mediaUrl !== undefined) data.mediaUrl = patch.mediaUrl;
  if (patch.blotatoJobId !== undefined) data.blotatoJobId = patch.blotatoJobId;
  if (patch.fallbackUsed !== undefined) data.fallbackUsed = patch.fallbackUsed;
  if (patch.validationResult !== undefined) data.validationJson = patch.validationResult as any;
  if (patch.durationMs !== undefined) data.durationMs = patch.durationMs;
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.publishedAt !== undefined) data.publishedAt = patch.publishedAt;

  return prisma.campaign.update({
    where: { idempotencyKey },
    data,
  });
};

export const getCampaignByIdempotencyKey = (idempotencyKey: string) =>
  prisma.campaign.findUnique({ where: { idempotencyKey } });

export const getCampaignByBlotatoJobId = (blotatoJobId: string) =>
  prisma.campaign.findFirst({ where: { blotatoJobId } });
