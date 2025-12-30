
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';
import { AspectRatio, ImageFile, AgentConfig, SocialPlatform, GroundingSource } from '../types';

// Agent 1: Orchestrateur
export const orchestrate = async (prompt: string, config: AgentConfig, platform: SocialPlatform): Promise<string> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  const instruction = `PERSONA: ${config.orchestratorPersona}. 
  TARGET PLATFORM: ${platform}.
  Task: Transform the user's idea into a detailed cinematic visual prompt. Focus on mood and technical lightning.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: instruction }
  });
  return response.text || prompt;
};

// Agent Image: Gemini 2.5 Flash Image
export const generateArt = async (prompt: string, aspectRatio: AspectRatio): Promise<ImageFile> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: aspectRatio === AspectRatio.LANDSCAPE ? "16:9" : "9:16"
      }
    }
  });

  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Artist agent failed.");

  const base64 = part.inlineData.data;
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {type: 'image/png'});
  const file = new File([blob], "asset.png", {type: 'image/png'});

  return { file, base64 };
};

// Agent 2: Marketer - AVEC GOOGLE SEARCH GROUNDING
export const marketAnalysis = async (
  image: ImageFile, 
  prompt: string, 
  config: AgentConfig, 
  platform: SocialPlatform
): Promise<{copy: string; sources: GroundingSource[]}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  // Le Marketer fait d'abord une recherche sur les tendances actuelles
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Research current viral advertising trends and successful hooks for ${platform} in 2024 related to this concept: "${prompt}". Then, write a high-converting ad copy for the attached image.`,
    config: { 
      systemInstruction: `PERSONA: ${config.marketerPersona}. Use Google Search to find real-time trends on ${platform}.`,
      tools: [{googleSearch: {}}]
    }
  });

  const copy = response.text || "Erreur de génération marketing.";
  
  // Extraction des sources de recherche
  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Source tendance",
          uri: chunk.web.uri
        });
      }
    });
  }

  return { copy, sources };
};

// Agent 3: Director
export const generateCampaignVideo = async (
  image: ImageFile, 
  marketingCopy: string, 
  aspectRatio: AspectRatio,
  platform: SocialPlatform
): Promise<{url: string; video: any}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `IMAGE READY. PLATFORM: ${platform}. COPY: ${marketingCopy}. Create a motion prompt for Veo 3.1.`,
  });
  
  const motionPrompt = scriptResponse.text || "Cinematic movement.";

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: motionPrompt,
    image: {
      imageBytes: image.base64,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoObject = operation.response?.generatedVideos?.[0]?.video;
  if (!videoObject?.uri) throw new Error('Video production failed.');

  const res = await fetch(`${videoObject.uri}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), video: videoObject };
};
