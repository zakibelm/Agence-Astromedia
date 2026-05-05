
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum AppState {
  IDLE,
  SETTINGS,
  ORCHESTRATING,
  IMAGING,
  MARKETING,
  SCRIPTING,
  VIDEO_GEN,
  SUCCESS,
  ERROR,
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

export interface AgentConfig {
  orchestratorPersona: string;
  marketerPersona: string;
  directorPersona: string;
}

export interface ProductionData {
  initialPrompt: string;
  enhancedPrompt: string;
  image?: ImageFile;
  marketingCopy?: string;
  videoUrl?: string;
  videoObject?: any;
  targetPlatform: SocialPlatform;
  groundingSources?: GroundingSource[];
  selectedMusic?: MusicTrack;
  musicMoodSuggestion?: string;
  productAssets?: ImageFile[];
  logo?: ImageFile;
}
