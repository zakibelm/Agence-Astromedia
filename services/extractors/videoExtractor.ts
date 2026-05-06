// services/extractors/videoExtractor.ts
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';
import { describeImages } from '../openRouterService';

const captureFrame = (video: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
};

export const extractVideo = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const frames = [0, duration / 2, duration * 0.9];
        const descriptions: string[] = [];

        for (const time of frames) {
          video.currentTime = time;
          await new Promise((r) => (video.onseeked = r));
          const dataUrl = captureFrame(video);
          const desc = await describeImages(
            [dataUrl],
            `Analyze this video frame at ${Math.round(
              time,
            )}s for brand identity. Describe motion, visual energy, color palette, and any logos visible.`,
          );
          descriptions.push(`[Frame ${Math.round(time)}s]: ${desc || 'No description'}`);
        }

        const finalContent = `Video Motion & Branding Analysis (${file.name}):\n\n${descriptions.join('\n\n')}`;
        URL.revokeObjectURL(video.src);

        resolve([
          {
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
          },
        ]);
      } catch (e) {
        URL.revokeObjectURL(video.src);
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
};
