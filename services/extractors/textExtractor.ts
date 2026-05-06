// services/extractors/textExtractor.ts — Plain text, Markdown, JSON
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

const CHUNK_SIZE = 800;   // chars per chunk
const CHUNK_OVERLAP = 100;

const chunkText = (text: string, sessionId: string, fileName: string, fileType: string): BrandChunk[] => {
  const chunks: BrandChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const content = text.slice(start, end).trim();
    if (content.length > 20) {
      chunks.push({
        id: uuidv4(),
        sessionId,
        sourceFile: fileName,
        fileType,
        content,
        pageOrSection: `Chunk ${index + 1}`,
        tokenCount: Math.ceil(content.length / 4),
        createdAt: new Date().toISOString(),
      });
      index++;
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
};

export const extractText = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  const text = await file.text();

  // JSON → pretty-print for readability
  if (file.name.endsWith('.json')) {
    try {
      const pretty = JSON.stringify(JSON.parse(text), null, 2);
      return chunkText(pretty, sessionId, file.name, 'json');
    } catch {
      return chunkText(text, sessionId, file.name, 'json');
    }
  }

  return chunkText(text, sessionId, file.name, 'txt');
};
