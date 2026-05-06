/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AppSettings, SocialPlatform, TemplateMapping } from '../types';

const BLOTATO_API_URL = 'https://backend.blotato.com/v2';

// Utility for observability logging
const logEvent = (step: string, status: 'success' | 'error' | 'info', message?: string) => {
  console.log(`[Blotato Pipeline] ${step} - ${status.toUpperCase()} : ${message || ''}`);
};

const blotatoFetch = async (path: string, apiKey: string, method = 'POST', body?: object) => {
  const options: RequestInit = {
    method,
    headers: {
      'blotato-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BLOTATO_API_URL}${path}`, options);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Blotato [${res.status}]: ${err}`);
  }

  return res.json();
};

export const generateMediaBlotato = async (
  templateMapping: TemplateMapping,
  settings: AppSettings,
  retries = 3
): Promise<{ url: string; fallbackUsed: boolean }> => {
  logEvent('MEDIA_GEN', 'info', `Starting media generation. Retries left: ${retries}`);
  
  try {
    /* ACTUAL BLOTATO CALL (Mocked logic)
    const response = await blotatoFetch('/videos/from-templates', settings.blotatoApiKey, 'POST', {
      templateId: templateMapping.templateId,
      format: templateMapping.format,
      variables: templateMapping.variables
    });
    
    // Polling logic for async generation
    let status = 'processing';
    let url = '';
    let timeoutCounter = 0;
    while(status === 'processing' && timeoutCounter < 60) { // 60s timeout
       await new Promise(r => setTimeout(r, 1000));
       const check = await blotatoFetch(\`/videos/\${response.id}\`, settings.blotatoApiKey, 'GET');
       status = check.status;
       if (status === 'completed') url = check.url;
       timeoutCounter++;
    }
    if(status !== 'completed') throw new Error('Timeout waiting for Blotato');
    return { url, fallbackUsed: false };
    */

    // Simulation for PRO version
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate rare random failure to demonstrate retry/fallback logic
    if (Math.random() < 0.2) {
      throw new Error('Blotato async failure (simulated)');
    }

    logEvent('MEDIA_GEN', 'success', `Media generated successfully.`);
    return { url: 'https://example.com/blotato-generated-media.mp4', fallbackUsed: false };

  } catch (error: any) {
    logEvent('MEDIA_GEN', 'error', error.message);
    if (retries > 0) {
      logEvent('MEDIA_GEN_RETRY', 'info', `Retrying generation. Remaining: ${retries - 1}`);
      return generateMediaBlotato(templateMapping, settings, retries - 1);
    }
    
    logEvent('MEDIA_GEN_FALLBACK', 'info', 'All retries failed. Using fallback.');
    return { url: 'https://example.com/fallback-media.jpg', fallbackUsed: true };
  }
};

export const publishBlotato = async (
  copy: string,
  mediaUrl: string,
  platform: SocialPlatform,
  settings: AppSettings
): Promise<any> => {
  logEvent('PUBLISH', 'info', `Publishing to ${platform}`);
  
  /* Example flow:
  const response = await blotatoFetch('/posts', settings.blotatoApiKey, 'POST', {
    content: copy,
    mediaUrls: [mediaUrl],
    platform: platform
  });
  */
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  logEvent('PUBLISH', 'success', `Published successfully.`);
  return { success: true, id: 'post_123' };
};

export const scheduleBlotato = async (
  copy: string,
  mediaUrl: string,
  platform: SocialPlatform,
  date: string,
  settings: AppSettings
): Promise<any> => {
  logEvent('SCHEDULE', 'info', `Scheduling to ${platform} at ${date}`);
  
  /* Example flow:
  const response = await blotatoFetch('/schedules', settings.blotatoApiKey, 'POST', {
    content: copy,
    mediaUrls: [mediaUrl],
    platform: platform,
    scheduledAt: date
  });
  */
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  logEvent('SCHEDULE', 'success', `Scheduled successfully.`);
  return { success: true, id: 'schedule_123' };
};
