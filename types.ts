
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Video } from '@google/genai';

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
  YOUTUBE = 'YouTube',
  FACEBOOK = 'Facebook',
  LINKEDIN = 'LinkedIn',
  X = 'X (Twitter)'
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
  videoObject?: Video;
  targetPlatform: SocialPlatform;
  groundingSources?: GroundingSource[];
}
