// src/types.ts — Shared types for the scale backend
export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'twitter';

export type CampaignStatus =
  | 'PENDING'
  | 'ORCHESTRATING'
  | 'MARKETING'
  | 'DIRECTING'
  | 'MEDIA_GEN'
  | 'VALIDATION'
  | 'DECISION'
  | 'PUBLISHING'
  | 'SCHEDULING'
  | 'COMPLETED'
  | 'FAILED';

export interface CampaignJobData {
  jobId: string;
  idempotencyKey: string;          // Prevents double processing on retry
  tenantId: string;
  prompt: string;
  platform: SocialPlatform;
  // Per-job API keys are deprecated — keys now live in env on the worker.
  // Kept optional for backwards compatibility with older queued jobs.
  openRouterApiKey?: string;
  blotatoApiKey?: string;
  textModel: string;
  orchestratorPersona: string;
  marketerPersona: string;
  directorPersona: string;
  priority?: number;               // 1 (low) → 10 (urgent)
  scheduledAt?: string;            // ISO date for scheduling
}

export interface CampaignResult {
  jobId: string;
  status: CampaignStatus;
  enhancedPrompt?: string;
  strategy?: string;
  marketingCopy?: string;
  templateMapping?: TemplateMapping;
  mediaUrl?: string;
  fallbackUsed?: boolean;
  validationResult?: ValidationResult;
  publishResult?: PublishResult;
  error?: string;
  durationMs?: number;
}

export interface TemplateMapping {
  templateId: string;
  format: 'image' | 'video';
  variables: Record<string, string>;
}

export interface ValidationResult {
  visual_quality: number;
  message_alignment: number;
  cta_present: boolean;
  brand_consistency: number;
  passed: boolean;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  platform: SocialPlatform;
  publishedAt: string;
}

export interface BlotatoWebhookPayload {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  media_url?: string;
  error?: string;
}
