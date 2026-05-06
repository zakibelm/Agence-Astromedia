// src/agents/openRouter.ts — LLM agents (used by both worker AND proxy routes)
import { CampaignJobData, TemplateMapping, ValidationResult } from '../types';
import { logger } from '../lib/logger';

const BASE_URL = 'https://openrouter.ai/api/v1';

interface LLMResponse {
  choices: Array<{ message: { content: string } }>;
}

const getApiKey = (override?: string): string => {
  const key = override || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OpenRouter API key missing (set OPENROUTER_API_KEY in env)');
  }
  return key;
};

interface CallOptions {
  apiKey?: string;
  model: string;
  messages: any[];
  jsonMode?: boolean;
}

const callOpenRouter = async (opts: CallOptions): Promise<string> => {
  const body: any = { model: opts.model, messages: opts.messages };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey(opts.apiKey)}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://astromedia.app',
      'X-Title': 'Astromedia Backend',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter [${res.status}]: ${await res.text()}`);
  }
  const data = (await res.json()) as LLMResponse;
  return data.choices?.[0]?.message?.content ?? '';
};

/**
 * Resilient JSON extractor — handles markdown fences, leading prose, etc.
 * Picks the smallest balanced object rather than greedy match.
 */
export const extractJSON = (content: string): any => {
  const trimmed = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    // Find first balanced { ... }
    const start = trimmed.indexOf('{');
    if (start === -1) throw new Error(`No JSON object in: "${content.slice(0, 100)}..."`);
    let depth = 0;
    for (let i = start; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++;
      else if (trimmed[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(start, i + 1));
          } catch (e: any) {
            throw new Error(`Failed to parse JSON: ${e.message}`);
          }
        }
      }
    }
    throw new Error(`Unbalanced JSON in: "${content.slice(0, 100)}..."`);
  }
};

// ─── Pure agent functions (used by proxy routes AND worker adapters) ─────────

export interface OrchestrateParams {
  prompt: string;
  platform: string;
  textModel: string;
  orchestratorPersona: string;
  brandContext?: string;
  productImagesBase64?: string[];
  logoBase64?: string;
  apiKey?: string;
}

export const orchestrate = async (p: OrchestrateParams) => {
  const userContent: any[] = [{ type: 'text', text: p.prompt }];
  p.productImagesBase64?.forEach((url) => userContent.push({ type: 'image_url', image_url: { url } }));
  if (p.logoBase64) userContent.push({ type: 'image_url', image_url: { url: p.logoBase64 } });

  const systemPrompt = `PERSONA: ${p.orchestratorPersona}
TARGET PLATFORM: ${p.platform}
${p.brandContext ? `\n## BRAND KNOWLEDGE BASE\n${p.brandContext}\n---\n` : ''}
Task: Analyze the creative vision and any provided assets.
1. Transform it into a detailed cinematic visual prompt.
2. Determine the perfect musical mood and genre.
3. Provide a brief overall strategy.
Return ONLY valid JSON with keys: "enhancedPrompt", "musicMood", "recommendedGenre" (one of: cinematic, urban, lofi, energetic), "strategy".`;

  const content = await callOpenRouter({
    apiKey: p.apiKey,
    model: p.textModel,
    jsonMode: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  try {
    return extractJSON(content);
  } catch (e: any) {
    logger.warn({ err: e }, 'orchestrate JSON parse failed, returning fallback');
    return {
      enhancedPrompt: p.prompt,
      musicMood: 'Neutral cinematic',
      recommendedGenre: 'cinematic',
      strategy: 'Default strategy (LLM output was malformed)',
    };
  }
};

export interface MarketParams {
  prompt: string;
  orchestratorVision: string;
  platform: string;
  textModel: string;
  marketerPersona: string;
  brandContext?: string;
  productImagesBase64?: string[];
  logoBase64?: string;
  apiKey?: string;
}

export const market = async (p: MarketParams): Promise<{ copy: string }> => {
  const userContent: any[] = [
    {
      type: 'text',
      text: `Concept: "${p.prompt}"\nOrchestrator Vision: ${p.orchestratorVision}`,
    },
  ];
  p.productImagesBase64?.forEach((url) => userContent.push({ type: 'image_url', image_url: { url } }));
  if (p.logoBase64) userContent.push({ type: 'image_url', image_url: { url: p.logoBase64 } });

  const content = await callOpenRouter({
    apiKey: p.apiKey,
    model: p.textModel,
    messages: [
      {
        role: 'system',
        content: `PERSONA: ${p.marketerPersona}. Write compelling, ${p.platform}-optimized ad copy.${
          p.brandContext ? `\n\nBRAND CONTEXT:\n${p.brandContext}` : ''
        }`,
      },
      { role: 'user', content: userContent },
    ],
  });

  return { copy: content };
};

export interface DirectParams {
  marketingCopy: string;
  orchestratorVision: string;
  platform: string;
  textModel: string;
  directorPersona: string;
  brandContext?: string;
  apiKey?: string;
}

export const direct = async (p: DirectParams): Promise<TemplateMapping> => {
  const systemPrompt = `PERSONA: ${p.directorPersona}
TARGET PLATFORM: ${p.platform}
${p.brandContext ? `\n## BRAND KNOWLEDGE\n${p.brandContext}\n---\n` : ''}
Task: Translate the copy + vision into a Blotato TemplateMapping.
Return ONLY valid JSON:
{"templateId":"default_video_template_01","format":"video","variables":{"headline":"...","cta":"...","visual_style":"...","scene_description":"...","color_palette":"...","aspect_ratio":"9:16"}}`;

  const content = await callOpenRouter({
    apiKey: p.apiKey,
    model: p.textModel,
    jsonMode: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Copy: ${p.marketingCopy}\nVision: ${p.orchestratorVision}` },
    ],
  });

  return extractJSON(content);
};

export interface ValidateParams {
  mediaUrl: string;
  marketingCopy: string;
  textModel: string;
  brandContext?: string;
  apiKey?: string;
}

export const validate = async (p: ValidateParams): Promise<ValidationResult> => {
  const systemPrompt = `You are a strict QA Reviewer for ad campaigns.
${p.brandContext ? `\n## BRAND COMPLIANCE\n${p.brandContext}\n---\n` : ''}
Return ONLY valid JSON:
{"visual_quality":0-10,"message_alignment":0-10,"cta_present":bool,"brand_consistency":0-10,"passed":bool}
"passed" is true ONLY if visual_quality>=7 AND message_alignment>=7 AND cta_present=true.`;

  const content = await callOpenRouter({
    apiKey: p.apiKey,
    model: p.textModel,
    jsonMode: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Media URL: ${p.mediaUrl}\nCopy: ${p.marketingCopy}` },
    ],
  });

  return extractJSON(content);
};

export interface VisionParams {
  imagesBase64: string[];
  prompt: string;
  textModel?: string;
  apiKey?: string;
}

const VISION_DEFAULT_MODEL = process.env.VISION_MODEL ?? 'google/gemini-2.0-flash-001';

export const describe = async (p: VisionParams): Promise<string> => {
  const userContent: any[] = [{ type: 'text', text: p.prompt }];
  p.imagesBase64.forEach((url) => userContent.push({ type: 'image_url', image_url: { url } }));

  return callOpenRouter({
    apiKey: p.apiKey,
    model: p.textModel ?? VISION_DEFAULT_MODEL,
    messages: [{ role: 'user', content: userContent }],
  });
};

// ─── Worker adapters (back-compat, used by src/worker.ts) ────────────────────

export const runOrchestrator = (data: CampaignJobData) =>
  orchestrate({
    prompt: data.prompt,
    platform: data.platform,
    textModel: data.textModel,
    orchestratorPersona: data.orchestratorPersona,
    apiKey: data.openRouterApiKey,
  });

export const runMarketer = (data: CampaignJobData, orchestratorVision: string) =>
  market({
    prompt: data.prompt,
    orchestratorVision,
    platform: data.platform,
    textModel: data.textModel,
    marketerPersona: data.marketerPersona,
    apiKey: data.openRouterApiKey,
  });

export const runDirector = (
  data: CampaignJobData,
  marketingCopy: string,
  orchestratorVision: string,
) =>
  direct({
    marketingCopy,
    orchestratorVision,
    platform: data.platform,
    textModel: data.textModel,
    directorPersona: data.directorPersona,
    apiKey: data.openRouterApiKey,
  });

export const runValidator = (data: CampaignJobData, mediaUrl: string, marketingCopy: string) =>
  validate({
    mediaUrl,
    marketingCopy,
    textModel: data.textModel,
    apiKey: data.openRouterApiKey,
  });
