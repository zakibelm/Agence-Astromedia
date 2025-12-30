
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { AspectRatio, SocialPlatform, MusicTrack } from '../types';
import MusicSelector from './MusicSelector';
import { 
  ArrowRight, 
  Music as MusicIcon, 
  Instagram, 
  Youtube, 
  Facebook, 
  Linkedin, 
  Twitter,
  Smartphone,
  Monitor,
  Play
} from 'lucide-react';

interface PromptFormProps {
  onSubmit: (prompt: string, aspectRatio: AspectRatio, platform: SocialPlatform, music: MusicTrack | null) => void;
  placeholder?: string;
  buttonLabel?: string;
}

const PromptForm: React.FC<PromptFormProps> = ({ 
  onSubmit, 
  placeholder = "Décrivez votre vision publicitaire...", 
  buttonLabel = "Lancer la Production"
}) => {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.TIKTOK);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);

  const platforms = [
    { id: SocialPlatform.TIKTOK, icon: MusicIcon, color: "hover:text-pink-500", ar: AspectRatio.PORTRAIT },
    { id: SocialPlatform.INSTAGRAM, icon: Instagram, color: "hover:text-fuchsia-500", ar: AspectRatio.PORTRAIT },
    { id: SocialPlatform.YOUTUBE_SHORTS, icon: Play, color: "hover:text-red-500", ar: AspectRatio.PORTRAIT },
    { id: SocialPlatform.YOUTUBE, icon: Youtube, color: "hover:text-red-600", ar: AspectRatio.LANDSCAPE },
    { id: SocialPlatform.FACEBOOK, icon: Facebook, color: "hover:text-blue-600", ar: AspectRatio.LANDSCAPE },
    { id: SocialPlatform.LINKEDIN, icon: Linkedin, color: "hover:text-blue-700", ar: AspectRatio.LANDSCAPE },
    { id: SocialPlatform.X, icon: Twitter, color: "hover:text-gray-400", ar: AspectRatio.LANDSCAPE },
  ];

  const handlePlatformSelect = (p: typeof platforms[0]) => {
    setPlatform(p.id);
    setAspectRatio(p.ar);
  };

  const toggleAspectRatio = () => {
    setAspectRatio(prev => prev === AspectRatio.LANDSCAPE ? AspectRatio.PORTRAIT : AspectRatio.LANDSCAPE);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt, aspectRatio, platform, selectedMusic);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl bg-[#111] border border-gray-800 rounded-[2.5rem] p-4 shadow-2xl focus-within:border-indigo-500/30 transition-all overflow-hidden">
      <div className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent p-6 text-xl text-white placeholder-gray-700 focus:outline-none resize-none min-h-[120px]"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6">
          <div className="flex flex-col gap-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Ciblage Plateforme</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePlatformSelect(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-bold transition-all ${
                    platform === p.id 
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                    : `bg-black/40 border-gray-800 text-gray-500 ${p.color}`
                  }`}
                >
                  <p.icon size={12} />
                  {p.id}
                </button>
              ))}
            </div>
          </div>

          <MusicSelector selected={selectedMusic} onSelect={setSelectedMusic} />
        </div>

        <div className="flex items-center justify-between border-t border-gray-800/50 pt-4 mt-2 px-6 pb-2">
          <div className="flex items-center gap-4">
             <button 
                type="button"
                onClick={toggleAspectRatio}
                className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 transition-colors group"
             >
               {aspectRatio === AspectRatio.LANDSCAPE ? (
                 <Monitor size={14} className="text-indigo-400 group-hover:scale-110 transition-transform"/>
               ) : (
                 <Smartphone size={14} className="text-indigo-400 group-hover:scale-110 transition-transform"/>
               )}
               <span className="text-[10px] font-mono text-gray-400 uppercase">Format {aspectRatio}</span>
             </button>
             <div className="hidden md:flex flex-col">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{platform}</p>
                <p className="text-[8px] text-gray-600 italic">Prêt pour déploiement</p>
             </div>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-full font-black hover:bg-indigo-500 transition-all disabled:opacity-20 disabled:grayscale group shadow-lg shadow-indigo-600/20 uppercase tracking-wider text-sm"
          >
            Lancer la production
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptForm;
