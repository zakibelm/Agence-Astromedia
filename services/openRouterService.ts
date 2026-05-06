/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AspectRatio, ImageFile, AppSettings, SocialPlatform, GroundingSource, TemplateMapping, ValidationResult } from '../types';

const BASE_URL = 'https://openrouter.ai/api/v1';

const openRouterFetch = async (path: string, apiKey: string, body: object): Promise<any> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Agence Astromédia',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter [${res.status}]: ${err}`);
  }

  return res.json();
};

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// Helper to extract JSON from a potentially messy LLM response
export const extractJSON = (content: string): any => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error('Failed to parse extracted JSON');
      }
    }
    throw new Error('No JSON object found in response');
  }
};

// Agent 1: Orchestrateur — vision + sortie JSON structurée
export const orchestrate = async (
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile,
  brandContext?: string
): Promise<{ enhancedPrompt: string; musicMood: string; recommendedGenre: string; strategy: string }> => {
  const systemPrompt = `PERSONA: ${settings.orchestratorPersona}.
TARGET PLATFORM: ${platform}.

${brandContext ? `## BRAND KNOWLEDGE BASE (IMPORTANT)
${brandContext}
---` : ''}

Task: Analyze the user's creative vision and provided product assets.
1. Transform it into a detailed cinematic visual prompt. If product images or a logo are provided, describe their style, colors, and features to incorporate them into the visual narrative.
2. Determine the perfect musical atmosphere (mood and genre) to match this vision.
3. Provide a brief overall strategy.
Return ONLY a valid JSON object with keys: "enhancedPrompt", "musicMood", "recommendedGenre" (must be one of: cinematic, urban, lofi, energetic), and "strategy".`;

  const userContent: ContentPart[] = [{ type: 'text', text: prompt }];

  productImages?.forEach(img => {
    userContent.push({ type: 'image_url', image_url: { url: img.base64 } });
  });
  if (logo) {
    userContent.push({ type: 'image_url', image_url: { url: logo.base64 } });
  }

  const data = await openRouterFetch('/chat/completions', settings.apiKey, {
    model: settings.textModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    const content = data.choices[0].message.content || '{}';
    return extractJSON(content);
  } catch {
    return { enhancedPrompt: prompt, musicMood: 'Neutral cinematic', recommendedGenre: 'cinematic', strategy: 'Default strategy' };
  }
};

// Agent 2: Marketeur — vision + copywriting
export const marketAnalysis = async (
  orchestratorVision: string,
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile,
  brandContext?: string
): Promise<{ copy: string; sources: GroundingSource[] }> => {
  const userContent: ContentPart[] = [
    {
      type: 'text',
      text: `Analyze current viral trends for ${platform} and write high-converting ad copy for this concept: "${prompt}".\n\nOrchestrator Vision: ${orchestratorVision}`,
    }
  ];

  productImages?.forEach(img => {
    userContent.push({ type: 'image_url', image_url: { url: img.base64 } });
  });
  if (logo) {
    userContent.push({ type: 'image_url', image_url: { url: logo.base64 } });
  }

  const data = await openRouterFetch('/chat/completions', settings.apiKey, {
    model: settings.textModel,
    messages: [
      {
        role: 'system',
        content: `PERSONA: ${settings.marketerPersona}. Write compelling, platform-optimized ad copy for ${platform}.
        ${brandContext ? `\n\nBRAND CONTEXT:\n${brandContext}` : ''}`,
      },
      { role: 'user', content: userContent },
    ],
  });

  const copy: string = data.choices[0].message.content || 'Erreur de génération marketing.';
  return { copy, sources: [] };
};

// Agent Director - Traduction visuelle et Template Mapping
export const directorAgent = async (
  marketingCopy: string,
  orchestratorVision: string,
  settings: AppSettings,
  platform: SocialPlatform,
  brandContext?: string
): Promise<TemplateMapping> => {
  const systemPrompt = `PERSONA: ${settings.directorPersona || "Creative Director"}.
TARGET PLATFORM: ${platform}.

${brandContext ? `## BRAND KNOWLEDGE (USE FOR VISUAL CONSISTENCY)
${brandContext}
---` : ''}

Task: Transform the marketing copy and orchestrator vision into a precise visual execution plan.
Return ONLY a valid JSON object representing a TemplateMapping for the Blotato media generator:
{
  "templateId": "default_video_template_01",
  "format": "video",
  "variables": {
    "headline": "Short punchy text derived from copy",
    "cta": "Call to action text",
    "visual_style": "Cinematic descriptions",
    "scene_description": "Detailed scene breakdown",
    "color_palette": "Hex codes or mood colors",
    "aspect_ratio": "9:16"
  }
}`;

  const userContent: ContentPart[] = [
    { type: 'text', text: `Marketing Copy: ${marketingCopy}\n\nVision: ${orchestratorVision}` }
  ];

  const data = await openRouterFetch('/chat/completions', settings.apiKey, {
    model: settings.textModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    response_format: { type: 'json_object' }
  });

  try {
    const content = data.choices[0].message.content || '{}';
    return extractJSON(content);
  } catch {
    throw new Error('Failed to parse Director output');
  }
};

// Agent Validation (QA)
export const validationAgent = async (
  visualResultUrl: string,
  marketingCopy: string,
  settings: AppSettings,
  brandContext?: string
): Promise<ValidationResult> => {
  const systemPrompt = `You are a strict QA Reviewer for Ad campaigns.
Review the provided media URL and copy.

${brandContext ? `## BRAND COMPLIANCE REFERENCE:
${brandContext}
---` : ''}

Return ONLY a valid JSON object representing a ValidationResult:
{
  "visual_quality": 8,
  "message_alignment": 9,
  "cta_present": true,
  "brand_consistency": 8,
  "passed": true
}
"passed" should be true ONLY if visual_quality >= 7, message_alignment >= 7, and cta_present is true.`;

  const userContent: ContentPart[] = [
    { type: 'text', text: `Review this media URL: ${visualResultUrl}\nAgainst this copy: ${marketingCopy}` }
  ];

  const data = await openRouterFetch('/chat/completions', settings.apiKey, {
    model: settings.textModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    response_format: { type: 'json_object' }
  });

  try {
    const content = data.choices[0].message.content || '{}';
    return extractJSON(content);
  } catch {
    throw new Error('Failed to parse Validation output');
  }
};
