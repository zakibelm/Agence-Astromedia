// services/ragService.ts
import { openDB, IDBPDatabase } from 'idb';
import { BrandChunk, BrandSession, BrandFileRecord, RetrievedChunk, RetrievalFilters } from '../types';
import { extractText } from './extractors/textExtractor';
import { extractPdf } from './extractors/pdfExtractor';
import { extractDocx } from './extractors/docxExtractor';
import { extractExcel } from './extractors/xlsxExtractor';
import { extractImage } from './extractors/imageExtractor';
import { extractVideo } from './extractors/videoExtractor';

const DB_NAME = 'astromedia_rag';
const DB_VERSION = 1;
const CHUNK_STORE = 'chunks';
const SESSION_STORE = 'sessions';

// --- CACHE & CONFIG ---
const retrievalCache = new Map<string, { results: RetrievedChunk[], timestamp: number }>();
const CACHE_TTL = 60000; // 60s

let dbPromise: Promise<IDBPDatabase>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: 'id' });
          chunkStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// --- CORE RAG LOGIC ---

/**
 * Advanced Weighted BM25-ish search with Intent & Tags filtering
 */
export const searchChunks = (
  query: string, 
  chunks: BrandChunk[], 
  topK: number = 5,
  filters?: RetrievalFilters
): RetrievedChunk[] => {
  if (!query || chunks.length === 0) return [];
  
  // Cache check
  const cacheKey = `${query}_${filters?.intent || 'none'}_${filters?.tags?.join(',') || ''}`;
  const cached = retrievalCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.results;
  }

  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  
  // 1. Filtering
  let filtered = chunks;
  if (filters) {
    if (filters.fileTypes) filtered = filtered.filter(c => filters.fileTypes!.includes(c.fileType));
    if (filters.tags) filtered = filtered.filter(c => c.tags?.some(t => filters.tags!.includes(t)));
    
    // Intent-based defaults
    if (filters.intent === 'marketing') {
        filtered = filtered.filter(c => c.tags?.includes('offer') || c.tags?.includes('branding') || ['txt', 'pdf', 'docx'].includes(c.fileType));
    } else if (filters.intent === 'visual') {
        filtered = filtered.filter(c => c.tags?.includes('style') || c.tags?.includes('visual') || ['image', 'video'].includes(c.fileType));
    }
  }

  // 2. Scoring
  const scoredChunks: RetrievedChunk[] = filtered.map(chunk => {
    let score = 0;
    const content = chunk.content.toLowerCase();
    
    queryTerms.forEach(term => {
      // Basic frequency
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        // Weighted score: count * weight
        score += (matches.length * (chunk.weight || 5));
      }
      
      // Bonus for title/source
      if (chunk.sourceFile.toLowerCase().includes(term)) {
        score += (5 * (chunk.weight || 5));
      }
    });
    
    return { chunk, score };
  });

  const results = scoredChunks
    .filter(sc => sc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Save to cache
  retrievalCache.set(cacheKey, { results, timestamp: Date.now() });

  return results;
};

export const formatContextForPrompt = (relevant: RetrievedChunk[], maxTokens: number = 2000): string => {
  if (relevant.length === 0) return '';
  
  let context = "## BRAND KNOWLEDGE CONTEXT (Grounded Sources)\n";
  let currentTokens = 0;

  for (const item of relevant) {
    const chunkTokens = item.chunk.tokenCount || Math.ceil(item.chunk.content.length / 4);
    if (currentTokens + chunkTokens > maxTokens) break;

    context += `\n--- Source: ${item.chunk.sourceFile} [Relevance: ${item.chunk.weight}/10] ---\n`;
    context += `${item.chunk.content}\n`;
    currentTokens += chunkTokens;
  }

  return context;
};

// --- DATABASE OPERATIONS ---

export const saveSession = async (session: BrandSession) => {
  const db = await getDB();
  await db.put(SESSION_STORE, session);
};

export const getSessions = async (): Promise<BrandSession[]> => {
  const db = await getDB();
  return db.getAll(SESSION_STORE);
};

export const deleteSession = async (sessionId: string) => {
  const db = await getDB();
  await db.delete(SESSION_STORE, sessionId);
  
  const tx = db.transaction(CHUNK_STORE, 'readwrite');
  const index = tx.store.index('sessionId');
  let cursor = await index.openCursor(IDBKeyRange.only(sessionId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
  retrievalCache.clear();
};

export const saveChunks = async (chunks: BrandChunk[]) => {
  const db = await getDB();
  const tx = db.transaction(CHUNK_STORE, 'readwrite');
  for (const chunk of chunks) {
    await tx.store.put(chunk);
  }
  await tx.done;
  retrievalCache.clear();
};

export const getChunksBySession = async (sessionId: string): Promise<BrandChunk[]> => {
  const db = await getDB();
  return db.getAllFromIndex(CHUNK_STORE, 'sessionId', sessionId);
};

// --- EXTRACTION COORDINATOR ---

export const ingestFile = async (
  file: File, 
  sessionId: string, 
  openRouterApiKey: string
): Promise<BrandChunk[]> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const name = file.name.toLowerCase();
  let chunks: BrandChunk[] = [];

  // Metadata determination
  let weight = 5;
  let defaultTags: string[] = [];

  if (name.includes('brand') || name.includes('guideline') || name.includes('identity')) {
    weight = 10;
    defaultTags.push('branding', 'style');
  } else if (name.includes('offer') || name.includes('promo') || name.includes('product')) {
    weight = 8;
    defaultTags.push('offer');
  }

  try {
    if (['txt', 'md', 'json'].includes(ext || '')) {
      chunks = await extractText(file, sessionId);
      defaultTags.push('copy');
    } else if (ext === 'pdf') {
      chunks = await extractPdf(file, sessionId);
    } else if (ext === 'docx') {
      chunks = await extractDocx(file, sessionId);
    } else if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      chunks = await extractExcel(file, sessionId);
      defaultTags.push('data');
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      chunks = await extractImage(file, sessionId, openRouterApiKey);
      defaultTags.push('visual');
    } else if (['mp4', 'webm', 'mov'].includes(ext || '')) {
      chunks = await extractVideo(file, sessionId, openRouterApiKey);
      defaultTags.push('visual', 'motion');
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error(`Error ingesting ${file.name}:`, error);
    throw error;
  }

  // Enrich chunks with metadata
  const enriched = chunks.map(c => ({
    ...c,
    weight: c.weight || weight,
    tags: [...new Set([...(c.tags || []), ...defaultTags])],
    tokenCount: c.tokenCount || Math.ceil(c.content.length / 4)
  }));

  if (enriched.length > 0) {
    await saveChunks(enriched);
  }
  
  return enriched;
};
