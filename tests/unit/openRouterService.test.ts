import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestrate, directorAgent, validationAgent } from '../../services/openRouterService';
import { AppSettings, SocialPlatform } from '../../types';

// Mock du global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('openRouterService Unit Tests', () => {
  const dummySettings: AppSettings = {
    apiKey: 'sk-or-dummy',
    blotatoApiKey: 'blt_dummy',
    textModel: 'test-model',
    imageModel: 'test-image',
    videoModel: 'test-video',
    orchestratorPersona: 'Orchestrator',
    marketerPersona: 'Marketer',
    directorPersona: 'Director'
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('orchestrate should parse valid JSON correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                enhancedPrompt: 'A cinematic shot',
                musicMood: 'Epic',
                recommendedGenre: 'cinematic',
                strategy: 'Aggressive'
              })
            }
          }
        ]
      })
    });

    const result = await orchestrate('Test prompt', dummySettings, SocialPlatform.TIKTOK);
    expect(result.enhancedPrompt).toBe('A cinematic shot');
    expect(result.strategy).toBe('Aggressive');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('orchestrate should fallback if JSON is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Not a JSON"
            }
          }
        ]
      })
    });

    const result = await orchestrate('Test prompt', dummySettings, SocialPlatform.TIKTOK);
    expect(result.enhancedPrompt).toBe('Test prompt');
    expect(result.strategy).toBe('Default strategy');
  });

  it('orchestrate should extract JSON from messy markdown', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `Voici votre réponse:
\`\`\`json
{
  "enhancedPrompt": "Resilient prompt",
  "strategy": "Resilient strategy"
}
\`\`\`
En espérant que cela vous plaise.`
            }
          }
        ]
      })
    });

    const result = await orchestrate('Test prompt', dummySettings, SocialPlatform.TIKTOK);
    expect(result.enhancedPrompt).toBe('Resilient prompt');
    expect(result.strategy).toBe('Resilient strategy');
  });

  it('validationAgent should return ValidationResult', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                visual_quality: 9,
                message_alignment: 8,
                cta_present: true,
                brand_consistency: 9,
                passed: true
              })
            }
          }
        ]
      })
    });

    const result = await validationAgent('http://vid.mp4', 'Buy now!', dummySettings);
    expect(result.passed).toBe(true);
    expect(result.visual_quality).toBe(9);
  });
});
