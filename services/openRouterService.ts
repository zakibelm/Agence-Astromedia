/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * services/openRouterService.ts
 * Thin client over the backend agent proxy. No API keys live in the browser.
 */
import {
  AppSettings,
  GroundingSource,
  ImageFile,
  SocialPlatform,
  TemplateMapping,
  ValidationResult,
} from '../types';
import { apiPost } from './apiClient';

// Re-exported for tests
export const extractJSON = (content: string): any => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No JSON object found in response');
  }
};

const imagesToBase64 = (images?: ImageFile[]) =>
  images && images.length > 0 ? images.map((i) => i.base64) : undefined;

// ── Agent 1: Orchestrator ─────────────────────────────────────────────────────
export const orchestrate = async (
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile,
  brandContext?: string,
): Promise<{
  enhancedPrompt: string;
  musicMood: string;
  recommendedGenre: string;
  strategy: string;
}> => {
  return apiPost('/agents/orchestrate', {
    prompt,
    platform,
    textModel: settings.textModel,
    orchestratorPersona: settings.orchestratorPersona,
    brandContext: brandContext || undefined,
    productImagesBase64: imagesToBase64(productImages),
    logoBase64: logo?.base64,
  });
};

// ── Agent 2: Marketer ─────────────────────────────────────────────────────────
export const marketAnalysis = async (
  orchestratorVision: string,
  prompt: string,
  settings: AppSettings,
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile,
  brandContext?: string,
): Promise<{ copy: string; sources: GroundingSource[] }> => {
  const { copy } = await apiPost<{ copy: string }>('/agents/market', {
    prompt,
    orchestratorVision,
    platform,
    textModel: settings.textModel,
    marketerPersona: settings.marketerPersona,
    brandContext: brandContext || undefined,
    productImagesBase64: imagesToBase64(productImages),
    logoBase64: logo?.base64,
  });
  return { copy, sources: [] };
};

// ── Agent 3: Director ─────────────────────────────────────────────────────────
export const directorAgent = async (
  marketingCopy: string,
  orchestratorVision: string,
  settings: AppSettings,
  platform: SocialPlatform,
  brandContext?: string,
): Promise<TemplateMapping> => {
  return apiPost('/agents/direct', {
    marketingCopy,
    orchestratorVision,
    platform,
    textModel: settings.textModel,
    directorPersona: settings.directorPersona,
    brandContext: brandContext || undefined,
  });
};

// ── Agent 4: Validator ────────────────────────────────────────────────────────
export const validationAgent = async (
  visualResultUrl: string,
  marketingCopy: string,
  settings: AppSettings,
  brandContext?: string,
): Promise<ValidationResult> => {
  return apiPost('/agents/validate', {
    mediaUrl: visualResultUrl,
    marketingCopy,
    textModel: settings.textModel,
    brandContext: brandContext || undefined,
  });
};

// ── Vision (used by extractors) ───────────────────────────────────────────────
export const describeImages = async (
  imagesBase64: string[],
  prompt: string,
  textModel?: string,
): Promise<string> => {
  const { description } = await apiPost<{ description: string }>('/agents/describe', {
    imagesBase64,
    prompt,
    textModel,
  });
  return description;
};
