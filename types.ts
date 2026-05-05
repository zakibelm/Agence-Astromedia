
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

export interface AppSettings {
  apiKey: string;
  textModel: string;
  imageModel: string;
  orchestratorPersona: string;
  marketerPersona: string;
  directorPersona: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  textModel: 'google/gemini-2.5-pro',
  imageModel: 'openai/dall-e-3',
  orchestratorPersona: 'A strategic creative lead with expertise in cinematic storytelling and technical prompt engineering.',
  marketerPersona: 'A world-class advertising executive. You use real-time data to create hyper-relevant viral content.',
  directorPersona: 'A visionary Hollywood director known for breathtaking visuals.',
};

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
