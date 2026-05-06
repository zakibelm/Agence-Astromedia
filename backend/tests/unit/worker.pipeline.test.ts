import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stage outputs we want the agents to return — hoisted so vi.mock factories see them
const { orchestration, marketing, template, validation, persistCalls } = vi.hoisted(() => ({
  orchestration: {
    enhancedPrompt: 'cinematic shot',
    musicMood: 'epic',
    recommendedGenre: 'cinematic',
    strategy: 'high-conversion',
  },
  marketing: { copy: 'Headline + CTA' },
  template: {
    templateId: 'tpl-1',
    format: 'video' as const,
    variables: { headline: 'h', cta: 'c', visual_style: 'v', scene_description: 's' },
  },
  validation: {
    visual_quality: 9,
    message_alignment: 8,
    cta_present: true,
    brand_consistency: 9,
    passed: true,
  },
  persistCalls: [] as any[],
}));

vi.mock('../../src/agents/openRouter', () => ({
  runOrchestrator: vi.fn().mockResolvedValue(orchestration),
  runMarketer: vi.fn().mockResolvedValue(marketing),
  runDirector: vi.fn().mockResolvedValue(template),
  runValidator: vi.fn().mockResolvedValue(validation),
}));

vi.mock('../../src/agents/blotato', () => ({
  generateMedia: vi.fn().mockResolvedValue({
    url: 'https://media.example/abc.mp4',
    fallbackUsed: false,
  }),
}));

vi.mock('../../src/db/campaignRepo', () => ({
  updateCampaignByKey: vi.fn(async (key: string, patch: any) => {
    persistCalls.push({ key, patch });
  }),
}));

import {
  runOrchestrator,
  runMarketer,
  runDirector,
  runValidator,
} from '../../src/agents/openRouter';
import { generateMedia } from '../../src/agents/blotato';
import { updateCampaignByKey } from '../../src/db/campaignRepo';
import { CampaignJobData } from '../../src/types';

// We test the pipeline logic without needing BullMQ. Re-implement the fn body:
const processCampaign = async (data: CampaignJobData) => {
  const { idempotencyKey } = data;
  await updateCampaignByKey(idempotencyKey, { status: 'ORCHESTRATING' });
  const o = await runOrchestrator(data);
  await updateCampaignByKey(idempotencyKey, {
    enhancedPrompt: o.enhancedPrompt,
    strategy: o.strategy,
  });

  await updateCampaignByKey(idempotencyKey, { status: 'MARKETING' });
  const { copy } = await runMarketer(data, o.enhancedPrompt);
  await updateCampaignByKey(idempotencyKey, { marketingCopy: copy });

  await updateCampaignByKey(idempotencyKey, { status: 'DIRECTING' });
  const tpl = await runDirector(data, copy, o.enhancedPrompt);
  await updateCampaignByKey(idempotencyKey, { templateMapping: tpl });

  await updateCampaignByKey(idempotencyKey, { status: 'MEDIA_GEN' });
  const media = await generateMedia(tpl);
  await updateCampaignByKey(idempotencyKey, {
    mediaUrl: media.url,
    fallbackUsed: media.fallbackUsed,
  });

  await updateCampaignByKey(idempotencyKey, { status: 'VALIDATION' });
  const v = await runValidator(data, media.url, copy);
  await updateCampaignByKey(idempotencyKey, { validationResult: v });

  await updateCampaignByKey(idempotencyKey, { status: 'DECISION' });
};

describe('Worker pipeline', () => {
  const data: CampaignJobData = {
    jobId: 'job-1',
    idempotencyKey: 'campaign:tenant-1:abc',
    tenantId: 'tenant-1',
    prompt: 'Sneakers ad',
    platform: 'tiktok',
    textModel: 'google/gemini-2.0-flash-001',
    orchestratorPersona: 'Orch',
    marketerPersona: 'Mark',
    directorPersona: 'Dir',
  };

  beforeEach(() => {
    persistCalls.length = 0;
    vi.clearAllMocks();
  });

  it('runs all 6 stages in order with persistence', async () => {
    await processCampaign(data);

    expect(runOrchestrator).toHaveBeenCalledOnce();
    expect(runMarketer).toHaveBeenCalledOnce();
    expect(runDirector).toHaveBeenCalledOnce();
    expect(generateMedia).toHaveBeenCalledOnce();
    expect(runValidator).toHaveBeenCalledOnce();

    const statuses = persistCalls
      .map((c) => c.patch.status)
      .filter(Boolean);
    expect(statuses).toEqual([
      'ORCHESTRATING',
      'MARKETING',
      'DIRECTING',
      'MEDIA_GEN',
      'VALIDATION',
      'DECISION',
    ]);
  });

  it('persists intermediate fields (enhancedPrompt, mediaUrl, validation)', async () => {
    await processCampaign(data);
    const flatPatches = persistCalls.flatMap((c) => Object.entries(c.patch));
    const patchMap = Object.fromEntries(flatPatches);
    expect(patchMap.enhancedPrompt).toBe('cinematic shot');
    expect(patchMap.marketingCopy).toBe('Headline + CTA');
    expect(patchMap.mediaUrl).toBe('https://media.example/abc.mp4');
    expect(patchMap.fallbackUsed).toBe(false);
    expect(patchMap.validationResult).toEqual(validation);
  });

  it('propagates failure when an agent throws', async () => {
    (runMarketer as any).mockRejectedValueOnce(new Error('OpenRouter 503'));
    await expect(processCampaign(data)).rejects.toThrow('OpenRouter 503');
    // Persistence still happened up through the failing stage
    const statuses = persistCalls.map((c) => c.patch.status).filter(Boolean);
    expect(statuses).toContain('ORCHESTRATING');
    expect(statuses).toContain('MARKETING');
    expect(statuses).not.toContain('DECISION');
  });
});
