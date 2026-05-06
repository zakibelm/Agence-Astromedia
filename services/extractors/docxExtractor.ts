// services/extractors/docxExtractor.ts
import mammoth from 'mammoth';
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

export const extractDocx = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const fullText = result.value;

  const chunks: BrandChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < fullText.length) {
    const end = Math.min(start + CHUNK_SIZE, fullText.length);
    const chunkContent = fullText.slice(start, end).trim();
    
    if (chunkContent.length > 50) {
      chunks.push({
        id: uuidv4(),
        sessionId,
        sourceFile: file.name,
        fileType: 'docx',
        content: chunkContent,
        pageOrSection: `Section ${index + 1}`,
        tokenCount: Math.ceil(chunkContent.length / 4),
        createdAt: new Date().toISOString(),
      });
      index++;
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
};
