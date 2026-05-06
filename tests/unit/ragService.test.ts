// tests/unit/ragService.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock extractors to avoid DOMMatrix errors in Node environment
vi.mock('../../services/extractors/pdfExtractor', () => ({ extractPdf: vi.fn() }));
vi.mock('../../services/extractors/docxExtractor', () => ({ extractDocx: vi.fn() }));
vi.mock('../../services/extractors/xlsxExtractor', () => ({ extractExcel: vi.fn() }));
vi.mock('../../services/extractors/imageExtractor', () => ({ extractImage: vi.fn() }));
vi.mock('../../services/extractors/videoExtractor', () => ({ extractVideo: vi.fn() }));
vi.mock('../../services/extractors/textExtractor', () => ({ extractText: vi.fn() }));

import { searchChunks } from '../../services/ragService';
import { BrandChunk } from '../../types';

describe('ragService - searchChunks (BM25)', () => {
  const mockChunks: BrandChunk[] = [
    {
      id: '1',
      sessionId: 's1',
      sourceFile: 'nike_brand_book.pdf',
      fileType: 'pdf',
      content: 'Nike colors are Volt Yellow and Black. The logo is a Swoosh.',
      tags: ['branding', 'style'],
      weight: 10,
      createdAt: '',
    },
    {
      id: '2',
      sessionId: 's1',
      sourceFile: 'adidas_guidelines.docx',
      fileType: 'docx',
      content: 'Adidas uses three stripes. Primary colors are blue and white.',
      tags: ['branding'],
      weight: 10,
      createdAt: '',
    },
    {
      id: '3',
      sessionId: 's1',
      sourceFile: 'nike_slogan.txt',
      fileType: 'txt',
      content: 'The famous slogan is Just Do It.',
      tags: ['copy'],
      weight: 5,
      createdAt: '',
    }
  ];

  it('should find relevant chunks for "nike colors"', () => {
    const results = searchChunks('nike colors', mockChunks);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.sourceFile).toBe('nike_brand_book.pdf');
  });

  it('should prioritize exact matches and frequency', () => {
    const results = searchChunks('stripes blue', mockChunks);
    expect(results[0].chunk.sourceFile).toBe('adidas_guidelines.docx');
  });

  it('should filter by intent (visual)', () => {
    const results = searchChunks('nike', mockChunks, 5, { intent: 'visual' });
    // Should only get pdf because of 'branding' tag mapping in visual intent
    expect(results.every(r => r.chunk.tags.includes('branding') || r.chunk.tags.includes('visual'))).toBe(true);
  });

  it('should return empty array for irrelevant query', () => {
    const results = searchChunks('pizzahut', mockChunks);
    expect(results.length).toBe(0);
  });
});
