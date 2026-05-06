// services/extractors/xlsxExtractor.ts
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BrandChunk } from '../../types';
import { uuidv4 } from '../../utils/uuid';

export const extractExcel = async (file: File, sessionId: string): Promise<BrandChunk[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const chunks: BrandChunk[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Format each sheet as a Markdown-like table context
    if (jsonData.length > 0) {
      const csvContent = Papa.unparse(jsonData);
      
      // Each sheet is its own chunk unless it's massive
      // For now, we treat one sheet = one chunk to keep relational data together
      chunks.push({
        id: uuidv4(),
        sessionId,
        sourceFile: file.name,
        fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        content: `Sheet: ${sheetName}\n\n${csvContent}`,
        pageOrSection: `Sheet: ${sheetName}`,
        tokenCount: Math.ceil(csvContent.length / 4),
        tags: [],
        weight: 5,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return chunks;
};
