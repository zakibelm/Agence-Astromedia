import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { BrandSession, BrandChunk, BrandFileRecord, User } from '../types';
import * as ragService from '../services/ragService';
import { uuidv4 } from '../utils/uuid';

interface BrandContextPanelProps {
  apiKey: string;
  user: User;
  onSessionChange: (session: BrandSession | null) => void;
}

export const BrandContextPanel = ({ apiKey, user, onSessionChange }: BrandContextPanelProps) => {
  const [sessions, setSessions] = useState<BrandSession[]>([]);
  const [activeSession, setActiveSession] = useState<BrandSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ragService.RetrievedChunk[]>([]);
  const [chunks, setChunks] = useState<BrandChunk[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadChunks(activeSession.id);
    } else {
      setChunks([]);
    }
  }, [activeSession]);

  const loadSessions = async () => {
    const data = await ragService.getSessions(user.id);
    setSessions(data);
    if (data.length > 0 && !activeSession) {
      setActiveSession(data[0]);
      onSessionChange(data[0]);
    }
  };

  const loadChunks = async (sessionId: string) => {
    const data = await ragService.getChunksBySession(sessionId);
    setChunks(data);
  };

  const createSession = async () => {
    const name = prompt('Nom du client ou de la marque :');
    if (!name) return;

    const newSession: BrandSession = {
      id: uuidv4(),
      ownerId: user.id,
      name,
      files: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ragService.saveSession(newSession);
    await loadSessions();
    setActiveSession(newSession);
    onSessionChange(newSession);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSession || !e.target.files) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const updatedSession = { ...activeSession };

    for (const file of files) {
      const fileRecord: BrandFileRecord = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
        status: 'processing',
        chunkCount: 0
      };
      
      updatedSession.files.push(fileRecord);
      setActiveSession({ ...updatedSession });

      try {
        const newChunks = await ragService.ingestFile(file, activeSession.id, apiKey);
        fileRecord.status = 'ready';
        fileRecord.chunkCount = newChunks.length;
      } catch (err) {
        fileRecord.status = 'error';
        fileRecord.errorMessage = 'Extraction échouée';
      }

      updatedSession.updatedAt = new Date().toISOString();
      await ragService.saveSession(updatedSession);
      setActiveSession({ ...updatedSession });
      await loadChunks(activeSession.id);
    }

    setIsUploading(false);
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Supprimer cette base de connaissance ?')) return;
    await ragService.deleteSession(id);
    if (activeSession?.id === id) {
      setActiveSession(null);
      onSessionChange(null);
    }
    await loadSessions();
  };

  const handleSearch = () => {
    if (!activeSession) return;
    const results = ragService.searchChunks(searchQuery, chunks);
    setSearchResults(results);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] border-l border-white/5 text-white overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold tracking-tight">Brand Knowledge</h2>
          </div>
          <button 
            onClick={createSession}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        <select 
          value={activeSession?.id || ''}
          onChange={(e) => {
            const s = sessions.find(s => s.id === e.target.value);
            setActiveSession(s || null);
            onSessionChange(s || null);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
        >
          <option value="" disabled>Sélectionner un client...</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!activeSession ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
            <UsersIcon className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm mb-6">Créez une session pour injecter le contexte de votre marque.</p>
          <button 
            onClick={createSession}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            Nouveau Client
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Ajouter des documents</h3>
            <label className="group relative block cursor-pointer">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 transition-all group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5">
                <div className="flex flex-col items-center text-center">
                  <CloudArrowUpIcon className="w-10 h-10 text-white/20 mb-3 group-hover:text-indigo-400 transition-colors" />
                  <p className="text-sm text-white/60 font-medium">Déposer brand book, images, guidelines...</p>
                  <p className="text-[10px] text-white/30 mt-1">PDF, DOCX, XLSX, Images, Vidéo</p>
                </div>
              </div>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          {/* Files List */}
          {activeSession.files.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Sources indexées ({activeSession.files.length})</h3>
              <div className="space-y-2">
                {activeSession.files.map(file => (
                  <div key={file.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        {file.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <PhotoIcon className="w-4 h-4 text-pink-400" /> :
                         file.name.match(/\.(mp4|mov|webm)$/i) ? <VideoCameraIcon className="w-4 h-4 text-amber-400" /> :
                         <DocumentTextIcon className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate pr-4">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {file.status === 'processing' ? (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              Extraction...
                            </span>
                          ) : file.status === 'ready' ? (
                            <span className="text-[10px] text-white/40">{file.chunkCount} segments prêts</span>
                          ) : (
                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                              <ExclamationCircleIcon className="w-3 h-3" /> Error
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {file.status === 'ready' && <CheckCircleIcon className="w-5 h-5 text-emerald-500/50" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Search */}
          <div className="space-y-4 pt-4 border-t border-white/5">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Tester la connaissance</h3>
             <div className="relative">
                <input 
                  type="text"
                  placeholder="Ex: Quelles sont les couleurs de Nike ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
             </div>

             {searchResults.length > 0 && (
               <div className="space-y-3 mt-4">
                  {searchResults.map(result => (
                    <div key={result.chunk.id} className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs">
                      <div className="flex items-center justify-between mb-2 opacity-50 italic">
                         <span>{result.chunk.sourceFile}</span>
                         <span>{result.chunk.pageOrSection}</span>
                      </div>
                      <p className="text-white/80 leading-relaxed italic">"{result.chunk.content.slice(0, 150)}..."</p>
                      <div className="mt-2 text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Score: {result.score.toFixed(2)}</div>
                    </div>
                  ))}
               </div>
             )}
          </div>

          <button 
            onClick={() => deleteSession(activeSession.id)}
            className="w-full py-3 mt-8 flex items-center justify-center gap-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-widest"
          >
            <TrashIcon className="w-4 h-4" />
            Supprimer la session client
          </button>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-indigo-600 animate-in slide-in-from-bottom-full duration-500">
          <div className="flex items-center gap-3">
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             <p className="text-xs font-bold tracking-wide uppercase">Industrialisation du contexte en cours...</p>
          </div>
        </div>
      )}
    </div>
  );
};
