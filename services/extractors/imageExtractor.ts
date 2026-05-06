// services/extractors/imageExtractor.ts
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';
import { describeImages } from '../openRouterService';

const PROMPT = `Analyze this brand asset and provide a structured summary for a Creative Director agent.
Include exactly these sections:
- COLORS: Dominant colors and their mood.
- TYPOGRAPHY: Font styles (serif, sans, bold, etc.).
- STYLE: Aesthetic (minimalist, brutalist, luxury, etc.).
- OBJECTS/LOGOS: What is visible.
- TEXT: Any copy present in the image.

Format as clear Markdown.`;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const extractImage = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  const dataUrl = await fileToDataUrl(file);
  const description = await describeImages([dataUrl], PROMPT);

  return [
    {
      id: uuidv4(),
      sessionId,
      sourceFile: file.name,
      fileType: 'image',
      content: description || 'Failed to describe image.',
      pageOrSection: 'Visual Identity Analysis',
      tags: ['visual', 'style'],
      weight: 7,
      tokenCount: Math.ceil((description || '').length / 4),
      createdAt: new Date().toISOString(),
    },
  ];
};
