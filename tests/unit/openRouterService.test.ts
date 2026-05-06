import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestrate, validationAgent } from '../../services/openRouterService';
import { AppSettings, SocialPlatform } from '../../types';

// Mock global fetch — apiClient calls /api/agents/* via fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const buildResponse = (body: unknown) => ({
  ok: true,
  text: async () => JSON.stringify(body),
});

describe('openRouterService (backend proxy client)', () => {
  const dummySettings: AppSettings = {
    textModel: 'test-model',
    imageModel: 'test-image',
    videoModel: 'test-video',
    orchestratorPersona: 'Orchestrator',
    marketerPersona: 'Marketer',
    directorPersona: 'Director',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('orchestrate forwards persona+model to /api/agents/orchestrate', async () => {
    mockFetch.mockResolvedValueOnce(
      buildResponse({
        enhancedPrompt: 'A cinematic shot',
        musicMood: 'Epic',
        recommendedGenre: 'cinematic',
        strategy: 'Aggressive',
      }),
    );

    const result = await orchestrate('Test prompt', dummySettings, SocialPlatform.TIKTOK);
    expect(result.enhancedPrompt).toBe('A cinematic shot');
    expect(result.strategy).toBe('Aggressive');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/agents/orchestrate');
    expect((init.headers as any)['x-astromedia-key']).toBeDefined();
    const body = JSON.parse(init.body);
    expect(body.prompt).toBe('Test prompt');
    expect(body.platform).toBe(SocialPlatform.TIKTOK);
    expect(body.textModel).toBe('test-model');
    expect(body.orchestratorPersona).toBe('Orchestrator');
  });

  it('validationAgent returns ValidationResult from backend', async () => {
    mockFetch.mockResolvedValueOnce(
      buildResponse({
        visual_quality: 9,
        message_alignment: 8,
        cta_present: true,
        brand_consistency: 9,
        passed: true,
      }),
    );

    const result = await validationAgent('http://vid.mp4', 'Buy now!', dummySettings);
    expect(result.passed).toBe(true);
    expect(result.visual_quality).toBe(9);
  });

  it('throws ApiError on non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: 'Unauthorized' }),
    });

    await expect(orchestrate('x', dummySettings, SocialPlatform.TIKTOK)).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
  });
});
