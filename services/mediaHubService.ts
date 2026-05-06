import { ApprovedMedia, SocialPlatform, ProductionData, ValidationResult } from '../types';
import { uuidv4 } from '../utils/uuid';

const STORAGE_KEY = 'astromedia_hub';

export const loadMediaHub = (): ApprovedMedia[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveMediaHub = (items: ApprovedMedia[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const computeQaScore = (v: ValidationResult): number =>
  Math.round(((v.visual_quality + v.message_alignment + v.brand_consistency) / 3) * 10) / 10;

export const approveAndSave = (prod: ProductionData): ApprovedMedia => {
  const hub = loadMediaHub();

  const entry: ApprovedMedia = {
    id: uuidv4(),
    approvedAt: new Date().toISOString(),
    platform: prod.targetPlatform,
    mediaUrl: prod.finalVideoUrl ?? prod.finalImageUrl ?? '',
    fallbackUsed: prod.fallbackUsed ?? false,
    marketingCopy: prod.marketingCopy ?? '',
    strategy: prod.strategy ?? '',
    enhancedPrompt: prod.enhancedPrompt ?? '',
    validationResult: prod.validationResult!,
    tags: extractTags(prod),
    usageCount: 0,
    qaScore: computeQaScore(prod.validationResult!),
  };

  saveMediaHub([entry, ...hub]);
  return entry;
};

export const incrementUsage = (id: string): void => {
  const hub = loadMediaHub();
  const updated = hub.map(m => m.id === id ? { ...m, usageCount: m.usageCount + 1 } : m);
  saveMediaHub(updated);
};

export const deleteFromHub = (id: string): void => {
  saveMediaHub(loadMediaHub().filter(m => m.id !== id));
};

const extractTags = (prod: ProductionData): string[] => {
  const tags: string[] = [prod.targetPlatform];
  if (prod.validationResult?.cta_present) tags.push('CTA ✓');
  if (prod.validationResult && prod.validationResult.visual_quality >= 8) tags.push('Top Visual');
  if (prod.validationResult && prod.validationResult.message_alignment >= 8) tags.push('Strong Copy');
  return tags;
};
