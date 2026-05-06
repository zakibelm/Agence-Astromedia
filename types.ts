
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// ── Auth Types ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User | null;
  token?: string;
}

// ── RAG Brand Context Types ──────────────────────────────────────

export type FileExtractionStatus = 'idle' | 'processing' | 'ready' | 'error';

export interface BrandChunk {
  id: string;
  sessionId: string;
  sourceFile: string;           // Original filename
  fileType: string;             // 'pdf' | 'docx' | 'image' | 'video' | 'xlsx' | 'txt'
  content: string;              // Extracted text / vision description
  pageOrSection?: string;       // "Page 3" | "Sheet: Budget" | "Frame 0:05"
  tokenCount?: number;          // Estimated token count
  tags: string[];               // ['branding', 'offer', 'persona', 'style', 'copy']
  weight: number;               // 1-10 priority (Brand Book = 10, Random Image = 3)
  createdAt: string;
}

export interface RetrievedChunk {
  chunk: BrandChunk;
  score: number;
}

export type RetrievalIntent = 'marketing' | 'visual' | 'general' | 'qa';

export interface RetrievalFilters {
  fileTypes?: string[];
  tags?: string[];
  intent?: RetrievalIntent;
}

export interface BrandFileRecord {
  id: string;
  name: string;
  type: string;                 // MIME type
  sizeBytes: number;
  status: FileExtractionStatus;
  chunkCount: number;
  errorMessage?: string;
}

export interface BrandSession {
  id: string;
  ownerId: string;               // Link to User.id
  name: string;                 // "Client Nike Q2 2025"
  clientName?: string;
  description?: string;
  files: BrandFileRecord[];
  createdAt: string;
  updatedAt: string;
}

export enum AppState {
  IDLE,
  SETTINGS,
  CREATED,
  ORCHESTRATING,
  MARKETING,
  DIRECTING,
  MEDIA_GEN,
  VALIDATION,
  DECISION,
  PUBLISHING,
  SCHEDULING,
  COMPLETED,
  FAILED,
  ROLLBACK,
  ERROR
}

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export enum SocialPlatform {
  TIKTOK = 'TikTok',
  INSTAGRAM = 'Instagram',
  YOUTUBE_SHORTS = 'YouTube Shorts',
  YOUTUBE = 'YouTube',
  FACEBOOK = 'Facebook',
  LINKEDIN = 'LinkedIn',
  X = 'X (Twitter)'
}

export interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  type: 'preset' | 'upload';
  file?: File;
  url?: string;
}

export interface ImageFile {
  file: File;
  base64: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type TemplateMapping = {
  templateId: string;
  format: "video" | "image";
  duration?: number;
  variables: {
    headline: string;
    subheadline?: string;
    body?: string;
    cta: string;
    visual_style: string;
    scene_description: string;
    color_palette?: string;
    brand_tone?: string;
    aspect_ratio?: "9:16" | "1:1" | "16:9";
  };
};

export type ValidationResult = {
  visual_quality: number; // /10
  message_alignment: number; // /10
  cta_present: boolean;
  brand_consistency: number; // /10
  passed: boolean;
};

export interface ApprovedMedia {
  id: string;
  approvedAt: string;
  platform: SocialPlatform;
  mediaUrl: string;
  fallbackUsed: boolean;
  marketingCopy: string;
  strategy: string;
  enhancedPrompt: string;
  validationResult: ValidationResult;
  tags: string[];
  usageCount: number;         // How many times re-used as template
  qaScore: number;            // Computed avg of visual_quality + message_alignment + brand_consistency
}

export type BudgetTracker = {
  max_per_execution: number;
  used: number;
};

export interface AppSettings {
  apiKey: string;
  blotatoApiKey: string;
  textModel: string;
  imageModel: string;
  videoModel: string;
  orchestratorPersona: string;
  marketerPersona: string;
  directorPersona: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  blotatoApiKey: import.meta.env.VITE_BLOTATO_API_KEY || '',
  textModel: 'google/gemini-2.5-pro',
  imageModel: 'black-forest-labs/flux-schnell',
  videoModel: 'kwaivgi/kling-v3.0-pro',
  orchestratorPersona: 'You are an elite Strategic Creative Lead. Your expertise lies in cinematic storytelling and advanced prompt engineering. You break down abstract ideas into structured, high-conversion visual and auditory concepts.',
  marketerPersona: 'You are a world-class advertising executive and viral copywriter. You leverage behavioral psychology, real-time cultural trends, and platform-specific algorithms to create hyper-relevant, high-converting content. Your tone is persuasive, punchy, and instantly hooks the audience. You always adapt perfectly to the specific format and demographic of the target platform.',
  directorPersona: 'You are a visionary Hollywood director and Director of Photography (DP) known for breathtaking, award-winning visuals. You conceptualize scenes with absolute mastery over lighting, framing, color grading, and camera dynamics. You describe visual prompts with extreme precision, focusing on mood, cinematic techniques (e.g., volumetric lighting, depth of field), and emotional resonance.',
};

export interface ProductionData {
  initialPrompt: string;
  enhancedPrompt: string;
  image?: ImageFile;
  marketingCopy?: string;
  videoUrl?: string;
  finalVideoUrl?: string;        // alias for hub
  finalImageUrl?: string;        // alias for hub
  fallbackUsed?: boolean;        // was fallback model used?
  strategy?: string;             // orchestrator strategy
  videoObject?: any;
  targetPlatform: SocialPlatform;
  groundingSources?: GroundingSource[];
  selectedMusic?: MusicTrack;
  musicMoodSuggestion?: string;
  productAssets?: ImageFile[];
  logo?: ImageFile;
  templateMapping?: TemplateMapping;
  validationResult?: ValidationResult;
  budget?: BudgetTracker;
}
