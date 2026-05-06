// services/extractors/videoExtractor.ts
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

const VISION_MODEL = 'google/gemini-2.0-flash-001';

const captureFrame = (video: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
};

export const extractVideo = async (file: File, sessionId: string, apiKey: string): Promise<BrandChunk[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const framesToCapture = [0, duration / 2, duration * 0.9]; // Start, Middle, End
      const descriptions: string[] = [];

      for (const time of framesToCapture) {
        video.currentTime = time;
        await new Promise(r => video.onseeked = r);
        
        const base64Data = captureFrame(video);
        
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: VISION_MODEL,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Analyze this video frame at ${Math.round(time)}s for brand identity. Describe the motion, visual energy, color palette, and any logos visible.` },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                  ]
                }
              ]
            })
          });
          const data = await response.json();
          descriptions.push(`[Frame ${Math.round(time)}s]: ${data.choices[0]?.message?.content || 'No description'}`);
        } catch (e) {
          console.error('Frame extraction error:', e);
        }
      }

      const finalContent = `Video Motion & Branding Analysis (${file.name}):\n\n${descriptions.join('\n\n')}`;
      
      resolve([{
        id: uuidv4(),
        sessionId,
        sourceFile: file.name,
        fileType: 'video',
        content: finalContent,
        pageOrSection: 'Motion Branding Summary',
        tags: ['visual', 'motion'],
        weight: 6,
        tokenCount: Math.ceil(finalContent.length / 4),
        createdAt: new Date().toISOString(),
      }]);
      
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => reject(new Error('Failed to load video'));
  });
};
