// services/extractors/pdfExtractor.ts
import * as pdfjsLib from 'pdfjs-dist';
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

// Configure worker - using the CDN version for ease in a Vite/React environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

export const extractPdf = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const chunks: BrandChunk[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText.length < 50) continue;

    // Sub-chunking if page is too large
    let start = 0;
    let subIndex = 0;
    while (start < pageText.length) {
      const end = Math.min(start + CHUNK_SIZE, pageText.length);
      const chunkContent = pageText.slice(start, end).trim();
      
      if (chunkContent.length > 50) {
        chunks.push({
          id: uuidv4(),
          sessionId,
          sourceFile: file.name,
          fileType: 'pdf',
          content: chunkContent,
          pageOrSection: `Page ${i}${subIndex > 0 ? ` (Part ${subIndex + 1})` : ''}`,
          tokenCount: Math.ceil(chunkContent.length / 4),
          tags: [],
          weight: 5,
          createdAt: new Date().toISOString(),
        });
        subIndex++;
      }
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
  }

  return chunks;
};
