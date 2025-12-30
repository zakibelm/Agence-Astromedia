
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef } from 'react';
import { MusicTrack } from '../types';
import { Music, Upload, Check, X, Headphones, Sparkles } from 'lucide-react';

interface Props {
  selected: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
  recommendationId?: string;
}

export const PRESET_TRACKS: MusicTrack[] = [
  { id: 'cinematic', name: 'Elite Cinematic', genre: 'Epic / Orchestral', type: 'preset' },
  { id: 'urban', name: 'Urban Pulse', genre: 'Hip-Hop / Bass', type: 'preset' },
  { id: 'lofi', name: 'Midnight Lo-Fi', genre: 'Chill / Aesthetic', type: 'preset' },
  { id: 'energetic', name: 'Cyber Neon', genre: 'Electronic / Fast', type: 'preset' },
];

const MusicSelector: React.FC<Props> = ({ selected, onSelect, recommendationId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect({
        id: `upload-${Date.now()}`,
        name: file.name,
        genre: 'Custom Upload',
        type: 'upload',
        file: file,
        url: URL.createObjectURL(file)
      });
    }
  };

  return (
    <div className="bg-black/20 rounded-3xl p-6 border border-gray-800/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-2">
          <Headphones size={12}/> Score & Soundtrack
        </h4>
        <div className="flex gap-2">
           <button 
             type="button"
             onClick={() => onSelect(null)}
             className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-1 ${!selected ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
           >
             <Sparkles size={10} /> Choix du Réalisateur
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PRESET_TRACKS.map((track) => {
          const isRecommended = track.id === recommendationId;
          const isSelected = selected?.id === track.id;
          
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track)}
              className={`relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                  : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Music size={14} className={isSelected ? 'text-indigo-400' : 'text-gray-700'} />
                {isSelected && <Check size={14} className="text-indigo-400" />}
              </div>
              <p className="text-[11px] font-bold truncate w-full">{track.name}</p>
              <p className="text-[9px] opacity-50 truncate w-full">{track.genre}</p>
              
              {isRecommended && !isSelected && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-0.5 shadow-lg">
                  <Sparkles size={10} fill="currentColor" />
                </div>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed transition-all ${
            selected?.type === 'upload'
              ? 'bg-indigo-600/10 border-indigo-500 text-white'
              : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-600 hover:bg-black/40'
          }`}
        >
          <Upload size={16} className="mb-1" />
          <p className="text-[10px] font-bold">Upload</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            className="hidden"
          />
        </button>
      </div>

      {!selected && (
        <div className="mt-4 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
          <p className="text-[9px] text-indigo-300 italic flex items-center gap-2">
            <Sparkles size={10} /> Le réalisateur IA sélectionnera la musique après analyse de votre scénario.
          </p>
        </div>
      )}

      {selected?.type === 'upload' && (
        <div className="mt-3 p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <p className="text-[9px] text-indigo-300 font-mono truncate">{selected.name}</p>
        </div>
      )}
    </div>
  );
};

export default MusicSelector;
