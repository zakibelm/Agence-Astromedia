/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import OpenAI from 'openai';
import { AspectRatio, ImageFile, AgentConfig, SocialPlatform, GroundingSource } from '../types';

const createClient = () => new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
    'X-Title': 'Agence Astromédia',
  },
});

// Agent 1: Orchestrateur — vision + sortie JSON structurée
export const orchestrate = async (
  prompt: string,
  config: AgentConfig,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{ enhancedPrompt: string; musicMood: string; recommendedGenre: string }> => {
  const client = createClient();

  const systemPrompt = `PERSONA: ${config.orchestratorPersona}.
TARGET PLATFORM: ${platform}.
Task: Analyze the user's creative vision and provided product assets.
1. Transform it into a detailed cinematic visual prompt. If product images or a logo are provided, describe their style, colors, and features to incorporate them into the visual narrative.
2. Determine the perfect musical atmosphere (mood and genre) to match this vision.
Return ONLY a valid JSON object with keys: "enhancedPrompt", "musicMood", "recommendedGenre" (must be one of: cinematic, urban, lofi, energetic).`;

  const userContent: OpenAI.ChatCompletionContentPart[] = [{ type: 'text', text: prompt }];

  productImages?.forEach(img => {
    userContent.push({ type: 'image_url', image_url: { url: img.base64 } });
  });

  if (logo) {
    userContent.push({ type: 'image_url', image_url: { url: logo.base64 } });
  }

  const response = await client.chat.completions.create({
    model: 'google/gemini-2.5-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch {
    return { enhancedPrompt: prompt, musicMood: 'Neutral cinematic', recommendedGenre: 'cinematic' };
  }
};

// Agent Image: DALL-E 3 via OpenRouter
export const generateArt = async (prompt: string, aspectRatio: AspectRatio): Promise<ImageFile> => {
  const client = createClient();

  const size = aspectRatio === AspectRatio.LANDSCAPE ? '1792x1024' : '1024x1792';

  const response = await client.images.generate({
    model: 'openai/dall-e-3',
    prompt,
    size: size as any,
    response_format: 'b64_json',
    n: 1,
  });

  const b64 = response.data[0].b64_json!;
  const dataUrl = `data:image/png;base64,${b64}`;

  const byteArray = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: 'image/png' });
  const file = new File([blob], 'asset.png', { type: 'image/png' });

  return { file, base64: dataUrl };
};

// Agent 2: Marketer — vision + copywriting
export const marketAnalysis = async (
  image: ImageFile,
  prompt: string,
  config: AgentConfig,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{ copy: string; sources: GroundingSource[] }> => {
  const client = createClient();

  const userContent: OpenAI.ChatCompletionContentPart[] = [
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

  const response = await client.chat.completions.create({
    model: 'google/gemini-2.5-pro',
    messages: [
      {
        role: 'system',
        content: `PERSONA: ${config.marketerPersona}. Write compelling, platform-optimized ad copy for ${platform}.`,
      },
      { role: 'user', content: userContent },
    ],
  });

  const copy = response.choices[0].message.content || 'Erreur de génération marketing.';
  return { copy, sources: [] };
};
