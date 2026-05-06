import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMediaBlotato } from '../../services/blotatoService';
import { AppSettings, TemplateMapping } from '../../types';

describe('blotatoService Unit Tests', () => {
  const dummySettings: AppSettings = {
    apiKey: 'sk-or-dummy',
    blotatoApiKey: 'blt_dummy',
    textModel: '', imageModel: '', videoModel: '', orchestratorPersona: '', marketerPersona: '', directorPersona: ''
  };

  const dummyMapping: TemplateMapping = {
    templateId: 'test_tpl',
    format: 'video',
    variables: {
      headline: 'H1', cta: 'Click', visual_style: 'Dark', scene_description: 'Test'
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generateMediaBlotato should succeed and not use fallback', async () => {
    // We mocked the internal delay, let's just run it
    // Wait, the original function uses Math.random() < 0.2 to simulate failure.
    // We should mock Math.random to always return 0.5 so it succeeds.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await generateMediaBlotato(dummyMapping, dummySettings);
    expect(result.fallbackUsed).toBe(false);
    expect(result.url).toContain('blotato-generated');
  });

  it('generateMediaBlotato should retry and eventually fallback if random always fails', async () => {
    // Mock Math.random to always return 0.1 so it fails
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const consoleSpy = vi.spyOn(console, 'log');

    const result = await generateMediaBlotato(dummyMapping, dummySettings, 2); // limit retries to speed up
    expect(result.fallbackUsed).toBe(true);
    expect(result.url).toContain('fallback-media');
    
    // Check observability
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Blotato Pipeline] MEDIA_GEN - ERROR'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Blotato Pipeline] MEDIA_GEN_FALLBACK - INFO'));
  }, 10000);
});
