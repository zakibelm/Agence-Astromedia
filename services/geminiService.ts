
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from '@google/genai';
import { AspectRatio, ImageFile, AgentConfig, SocialPlatform, GroundingSource } from '../types';

// Agent 1: Orchestrateur avec sortie structurée (Visuel + Musique)
export const orchestrate = async (
  prompt: string, 
  config: AgentConfig, 
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{enhancedPrompt: string, musicMood: string, recommendedGenre: string}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  const instruction = `PERSONA: ${config.orchestratorPersona}. 
  TARGET PLATFORM: ${platform}.
  Task: Analyze the user's creative vision and provided product assets. 
  1. Transform it into a detailed cinematic visual prompt. If product images or a logo are provided, describe their style, colors, and features to incorporate them into the visual narrative.
  2. Determine the perfect musical atmosphere (mood and genre) to match this vision.
  Return a JSON object with keys: "enhancedPrompt", "musicMood", "recommendedGenre" (must be one of: cinematic, urban, lofi, energetic).`;
  
  const content: any[] = [{ text: prompt }];
  
  if (productImages && productImages.length > 0) {
    productImages.forEach(img => {
      content.push({
        inlineData: {
          mimeType: img.file.type,
          data: img.base64.split(',')[1] // extract just the base64 part
        }
      });
    });
  }
  
  if (logo) {
    content.push({
      inlineData: {
        mimeType: logo.file.type,
        data: logo.base64.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ role: 'user', parts: content }],
    config: { 
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          enhancedPrompt: { type: Type.STRING },
          musicMood: { type: Type.STRING },
          recommendedGenre: { type: Type.STRING }
        },
        required: ["enhancedPrompt", "musicMood", "recommendedGenre"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { 
      enhancedPrompt: prompt, 
      musicMood: "Neutral cinematic", 
      recommendedGenre: "cinematic" 
    };
  }
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

// Agent 2: Marketer
export const marketAnalysis = async (
  image: ImageFile, 
  prompt: string, 
  config: AgentConfig, 
  platform: SocialPlatform,
  productImages?: ImageFile[],
  logo?: ImageFile
): Promise<{copy: string; sources: GroundingSource[]}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  const content: any[] = [
    { text: `Analyze current viral trends for ${platform} and write high-converting ad copy for this concept: "${prompt}". Use the provided images (generated scene, product shots, logo) for context.` },
    {
      inlineData: {
        mimeType: image.file.type,
        data: image.base64.split(',')[1]
      }
    }
  ];

  if (productImages) {
    productImages.forEach(img => {
      content.push({
        inlineData: { mimeType: img.file.type, data: img.base64.split(',')[1] }
      });
    });
  }

  if (logo) {
    content.push({
      inlineData: { mimeType: logo.file.type, data: logo.base64.split(',')[1] }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ role: 'user', parts: content }],
    config: { 
      systemInstruction: `PERSONA: ${config.marketerPersona}. Use Google Search to find real-time trends related to the product shown.`,
      tools: [{googleSearch: {}}]
    }
  });

  const copy = response.text || "Erreur de génération marketing.";
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
    contents: `Create a motion prompt for Veo 3.1 based on this script: ${marketingCopy}. The visuals must be high-end.`,
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
