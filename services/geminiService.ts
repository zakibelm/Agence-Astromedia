/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AspectRatio, ImageFile, AppSettings, SocialPlatform, GroundingSource } from '../types';

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

// Agent 1: Orchestrateur — vision + sortie JSON structurée
export const orchestrate = async (
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{ enhancedPrompt: string; musicMood: string; recommendedGenre: string }> => {
  const systemPrompt = `PERSONA: ${settings.orchestratorPersona}.
TARGET PLATFORM: ${platform}.
Task: Analyze the user's creative vision and provided product assets.
1. Transform it into a detailed cinematic visual prompt. If product images or a logo are provided, describe their style, colors, and features to incorporate them into the visual narrative.
2. Determine the perfect musical atmosphere (mood and genre) to match this vision.
Return ONLY a valid JSON object with keys: "enhancedPrompt", "musicMood", "recommendedGenre" (must be one of: cinematic, urban, lofi, energetic).`;

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
    return JSON.parse(data.choices[0].message.content || '{}');
  } catch {
    return { enhancedPrompt: prompt, musicMood: 'Neutral cinematic', recommendedGenre: 'cinematic' };
  }
};

// Agent Image: génération via OpenRouter
export const generateArt = async (
  prompt: string,
  aspectRatio: AspectRatio,
  settings: AppSettings
): Promise<ImageFile> => {
  const size = aspectRatio === AspectRatio.LANDSCAPE ? '1792x1024' : '1024x1792';

  const data = await openRouterFetch('/images/generations', settings.apiKey, {
    model: settings.imageModel,
    prompt,
    size,
    response_format: 'b64_json',
    n: 1,
  });

  const b64: string = data.data[0].b64_json;
  const dataUrl = `data:image/png;base64,${b64}`;

  const byteArray = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: 'image/png' });
  const file = new File([blob], 'asset.png', { type: 'image/png' });

  return { file, base64: dataUrl };
};

// Agent 2: Marketeur — vision + copywriting
export const marketAnalysis = async (
  image: ImageFile,
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{ copy: string; sources: GroundingSource[] }> => {
  const userContent: ContentPart[] = [
    {
      type: 'text',
      text: `Analyze current viral trends for ${platform} and write high-converting ad copy for this concept: "${prompt}". Use the provided images (generated scene, product shots, logo) for context.`,
    },
    { type: 'image_url', image_url: { url: image.base64 } },
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
        content: `PERSONA: ${settings.marketerPersona}. Write compelling, platform-optimized ad copy for ${platform}.`,
      },
      { role: 'user', content: userContent },
    ],
  });

  const copy: string = data.choices[0].message.content || 'Erreur de génération marketing.';
  return { copy, sources: [] };
};
