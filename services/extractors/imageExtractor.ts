// services/extractors/imageExtractor.ts
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

const VISION_MODEL = 'google/gemini-2.0-flash-001'; // Efficient vision model

export const extractImage = async (file: File, sessionId: string, apiKey: string): Promise<BrandChunk[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      const base64Data = base64Image.split(',')[1];
      const mimeType = file.type;

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://astromedia.agency',
            'X-Title': 'Astromedia Brand RAG'
          },
          body: JSON.stringify({
            model: VISION_MODEL,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze this brand asset and provide a structured summary for a Creative Director agent. 
Include exactly these sections:
- COLORS: Dominant colors and their mood.
- TYPOGRAPHY: Font styles (serif, sans, bold, etc.).
- STYLE: Aesthetic (minimalist, brutalist, luxury, etc.).
- OBJECTS/LOGOS: What is visible.
- TEXT: Any copy present in the image.

Format as clear Markdown.`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`
                    }
                  }
                ]
              }
            ]
          })
        });

        const data = await response.json();
        const description = data.choices[0]?.message?.content || 'Failed to describe image.';

        resolve([{
          id: uuidv4(),
          sessionId,
          sourceFile: file.name,
          fileType: 'image',
          content: description,
          pageOrSection: 'Visual Identity Analysis',
          tags: ['visual', 'style'],
          weight: 7,
          tokenCount: Math.ceil(description.length / 4),
          createdAt: new Date().toISOString(),
        }]);
      } catch (error) {
        console.error('Image extraction error:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
