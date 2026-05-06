import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMediaBlotato } from '../../services/blotatoService';
import { AppSettings, TemplateMapping } from '../../types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('blotatoService (backend proxy client)', () => {
  const dummySettings: AppSettings = {
    textModel: '',
    imageModel: '',
    videoModel: '',
    orchestratorPersona: '',
    marketerPersona: '',
    directorPersona: '',
  };

  const dummyMapping: TemplateMapping = {
    templateId: 'test_tpl',
    format: 'video',
    variables: {
      headline: 'H1',
      cta: 'Click',
      visual_style: 'Dark',
      scene_description: 'Test',
    },
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('forwards templateMapping to /api/media/generate', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ url: 'https://media.example/abc.mp4', fallbackUsed: false }),
    });

    const result = await generateMediaBlotato(dummyMapping, dummySettings);
    expect(result.url).toBe('https://media.example/abc.mp4');
    expect(result.fallbackUsed).toBe(false);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('/media/generate');
    expect((init.headers as any)['x-astromedia-key']).toBeDefined();
    const body = JSON.parse(init.body);
    expect(body.templateMapping.templateId).toBe('test_tpl');
  });

  it('throws ApiError when backend returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: 'Upstream blotato error' }),
    });

    await expect(generateMediaBlotato(dummyMapping, dummySettings)).rejects.toMatchObject({
      status: 502,
      message: 'Upstream blotato error',
    });
  });
});
