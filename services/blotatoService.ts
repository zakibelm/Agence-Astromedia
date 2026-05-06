/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * services/blotatoService.ts
 * Thin client over /api/media/* — Blotato secrets live on the backend.
 */
import { AppSettings, SocialPlatform, TemplateMapping } from '../types';
import { apiPost } from './apiClient';

export const generateMediaBlotato = async (
  templateMapping: TemplateMapping,
  _settings: AppSettings,
): Promise<{ url: string; fallbackUsed: boolean }> => {
  return apiPost('/media/generate', { templateMapping });
};

export const publishBlotato = async (
  copy: string,
  mediaUrl: string,
  platform: SocialPlatform,
  _settings: AppSettings,
) => {
  return apiPost('/media/publish', { copy, mediaUrl, platform });
};

export const scheduleBlotato = async (
  copy: string,
  mediaUrl: string,
  platform: SocialPlatform,
  scheduledAt: string,
  _settings: AppSettings,
) => {
  return apiPost('/media/schedule', { copy, mediaUrl, platform, scheduledAt });
};
