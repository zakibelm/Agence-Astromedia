
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import { orchestrate, generateArt, marketAnalysis, generateCampaignVideo } from './services/geminiService';
import {
  AppState,
  AspectRatio,
  SocialPlatform,
  AgentConfig,
  ProductionData
} from './types';
import { 
  Settings, 
  Play, 
  Cpu, 
  Palette, 
  Megaphone, 
  Clapperboard, 
  CheckCircle2, 
  ChevronRight,
  RotateCcw,
  Download,
  Share2,
  ExternalLink,
  Search
} from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [config, setConfig] = useState<AgentConfig>({
    orchestratorPersona: "A strategic creative lead with expertise in cinematic storytelling and technical prompt engineering.",
    marketerPersona: "A world-class advertising executive. You use real-time data to create hyper-relevant viral content.",
    directorPersona: "A visionary Hollywood director known for breathtaking visuals."
  });
  
  const [prod, setProd] = useState<ProductionData>({
    initialPrompt: "",
    enhancedPrompt: "",
    targetPlatform: SocialPlatform.TIKTOK,
    groundingSources: []
  });
  
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startProduction = async (prompt: string, ar: AspectRatio, platform: SocialPlatform) => {
    setAspectRatio(ar);
    setProd({ initialPrompt: prompt, enhancedPrompt: "", targetPlatform: platform, groundingSources: [] });
    
    try {
      setAppState(AppState.ORCHESTRATING);
      const enhanced = await orchestrate(prompt, config, platform);
      setProd(prev => ({ ...prev, enhancedPrompt: enhanced }));
      
      setAppState(AppState.IMAGING);
      const image = await generateArt(enhanced, ar);
      setProd(prev => ({ ...prev, image }));
      setAppState(AppState.MARKETING);
      
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const approveImage = async () => {
    if (!prod.image) return;
    try {
      setAppState(AppState.MARKETING);
      const { copy, sources } = await marketAnalysis(prod.image, prod.initialPrompt, config, prod.targetPlatform);
      setProd(prev => ({ ...prev, marketingCopy: copy, groundingSources: sources }));
      setAppState(AppState.SCRIPTING);
      
      setAppState(AppState.VIDEO_GEN);
      const {url, video} = await generateCampaignVideo(prod.image, copy, aspectRatio, prod.targetPlatform);
      setProd(prev => ({ ...prev, videoUrl: url, videoObject: video }));
      setAppState(AppState.SUCCESS);
      
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const renderSettings = () => (
    <div className="flex-grow flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Settings className="text-indigo-400" /> Agent Laboratory
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
        {[
          { key: 'orchestratorPersona', label: 'Orchestrator', icon: Cpu },
          { key: 'marketerPersona', label: 'Marketer', icon: Megaphone },
          { key: 'directorPersona', label: 'Director', icon: Clapperboard }
        ].map(agent => (
          <div key={agent.key} className="bg-[#111] border border-gray-800 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <agent.icon size={18} /> {agent.label}
            </div>
            <textarea
              className="bg-black/50 border border-gray-800 rounded-xl p-3 text-sm min-h-[150px] focus:border-indigo-500 outline-none"
              value={(config as any)[agent.key]}
              onChange={(e) => setConfig({...config, [agent.key]: e.target.value})}
            />
          </div>
        ))}
      </div>
      <button 
        onClick={() => setAppState(AppState.IDLE)}
        className="px-12 py-4 bg-white text-black font-bold rounded-full hover:bg-indigo-400 hover:text-white transition-all"
      >
        Sauvegarder & Retour
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-[#050505] text-gray-200 flex flex-col font-sans overflow-hidden">
      <header className="p-6 border-b border-gray-900 flex justify-between items-center bg-black/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Clapperboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">AGENCE ASTROMÉDIA <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded ml-2 font-black">PRO</span></h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-semibold">Production média pour les réseaux sociaux</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setAppState(AppState.SETTINGS)} className="p-3 hover:bg-gray-900 rounded-xl transition-colors border border-gray-800">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-y-auto custom-scrollbar">
        {appState === AppState.SETTINGS ? renderSettings() : (
          <div className="max-w-6xl mx-auto w-full p-8 flex flex-col flex-grow">
            {appState === AppState.IDLE && (
              <div className="flex-grow flex flex-col items-center justify-center py-10 animate-in fade-in duration-1000">
                <div className="text-center mb-10">
                  <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">AI CAMPAIGN STUDIO</h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto italic font-medium leading-relaxed">
                    Votre assistant IA d'élite pour propulser vos idées en <span className="text-indigo-400 font-bold">productions média de pointe</span>.
                  </p>
                </div>
                <PromptForm onSubmit={startProduction} />
              </div>
            )}

            {(appState >= AppState.ORCHESTRATING && appState <= AppState.VIDEO_GEN) && (
              <div className="flex-grow flex flex-col items-center justify-center gap-12">
                <LoadingIndicator state={appState} />
                <div className="flex items-center gap-8 text-xs font-mono tracking-widest uppercase opacity-50">
                   Génération par Agent IA en cours...
                </div>
              </div>
            )}

            {appState === AppState.MARKETING && prod.image && (
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-in zoom-in-95 duration-500">
                <div className="relative group rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                  <img src={URL.createObjectURL(prod.image.file)} className="w-full object-contain" />
                </div>
                <div className="flex flex-col gap-6">
                  <div className="bg-[#111] p-8 rounded-3xl border border-gray-800">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase mb-4">
                       <Search size={14}/> Analyse Strategique IA
                    </div>
                    <p className="text-2xl font-bold leading-tight mb-8">
                      Le visuel est prêt. Notre assistant marketing finalise l'analyse pour maximiser votre impact sur <span className="text-white underline">{prod.targetPlatform}</span>.
                    </p>
                    <button 
                      onClick={approveImage}
                      className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-indigo-400 hover:text-white transition-all flex items-center justify-center gap-3"
                    >
                      DÉPLOYER LA STRATÉGIE <Play size={20} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {appState === AppState.SUCCESS && prod.videoUrl && (
              <div className="flex-grow flex flex-col items-center gap-10 py-10 animate-in fade-in duration-1000">
                <div className={`w-full ${aspectRatio === AspectRatio.PORTRAIT ? 'max-w-sm' : 'max-w-4xl'} rounded-3xl overflow-hidden shadow-2xl border border-white/10`}>
                  <video src={prod.videoUrl} controls autoPlay loop className="w-full object-cover" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                  <div className="bg-[#111] p-8 rounded-3xl border border-gray-800">
                    <h4 className="text-indigo-400 text-[10px] uppercase font-bold mb-4 flex items-center gap-2">
                      <Megaphone size={12}/> Copywriting & Intelligence Marché
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line font-mono mb-6">
                      {prod.marketingCopy}
                    </p>
                    
                    {prod.groundingSources && prod.groundingSources.length > 0 && (
                      <div className="border-t border-gray-800 pt-4">
                        <h5 className="text-[10px] text-gray-500 uppercase mb-3 text-indigo-400/50">Intelligence Connectée (Sources) :</h5>
                        <div className="flex flex-wrap gap-2">
                          {prod.groundingSources.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1 bg-black/50 border border-gray-800 rounded-full text-[10px] text-gray-400 hover:text-indigo-400 transition-colors">
                              {s.title.substring(0, 20)}... <ExternalLink size={10} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-indigo-600/10 border border-indigo-500/30 p-6 rounded-3xl">
                       <h4 className="text-white text-sm font-bold mb-2">Astromédia Intelligence d'Élite</h4>
                       <p className="text-gray-400 text-xs leading-relaxed">Contenu optimisé par nos agents pour une audience {prod.targetPlatform}. Produit fini prêt pour l'exportation master.</p>
                    </div>
                    <button onClick={() => setAppState(AppState.IDLE)} className="flex items-center justify-center gap-2 py-4 bg-gray-900 border border-gray-800 rounded-2xl font-bold hover:bg-gray-800 transition-all mt-auto">
                      <RotateCcw size={18} /> Nouvelle Production
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
