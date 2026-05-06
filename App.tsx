import React, { useState, useEffect, useCallback } from 'react';
import { Clapperboard, Settings, AlertTriangle, CheckCircle, RefreshCw, Send, Calendar, Library, Users as UsersIcon } from 'lucide-react';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import MediaHub from './components/MediaHub';
import { PRESET_TRACKS } from './components/MusicSelector';
import { orchestrate, marketAnalysis, directorAgent, validationAgent } from './services/openRouterService';
import { generateMediaBlotato, publishBlotato, scheduleBlotato } from './services/blotatoService';
import { approveAndSave, loadMediaHub } from './services/mediaHubService';
import SettingsPage from './components/SettingsPage';
import { AuthPage } from './components/AuthPage';
import * as authService from './services/authService';
import {
  AppState,
  AspectRatio,
  ProductionData,
  ImageFile,
  SocialPlatform,
  MusicTrack,
  AppSettings,
  ValidationResult,
  ApprovedMedia,
  BrandSession,
  BrandChunk,
  User
} from './types';
import { BrandContextPanel } from './components/BrandContextPanel';
import * as ragService from './services/ragService';
const loadSettings = (): AppSettings => {
  const saved = localStorage.getItem('astromedia_settings');
  if (saved) return JSON.parse(saved);
  return {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    blotatoApiKey: import.meta.env.VITE_BLOTATO_API_KEY || '',
    textModel: 'openai/o3-mini-high',
    imageModel: 'black-forest-labs/flux-schnell',
    videoModel: 'kwaivgi/kling-v3.0-pro',
    orchestratorPersona: 'A world-class creative strategist who conceptualizes high-end advertising campaigns. You understand current viral trends, platform specifics, and audience psychology.',
    marketerPersona: 'A world-class advertising executive. You use real-time data to create hyper-relevant viral content.',
    directorPersona: 'A visionary Hollywood director known for breathtaking visuals.'
  };
};

const saveSettings = (s: AppSettings) => {
  localStorage.setItem('astromedia_settings', JSON.stringify(s));
};
const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [appState, setAppState] = useState<AppState>(
    () => loadSettings().apiKey ? AppState.IDLE : AppState.SETTINGS
  );
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentSession().user);

  const handleSaveSettings = (s: AppSettings) => {
    saveSettings(s);
    setSettings(s);
    setAppState(AppState.IDLE);
  };
  
  const [prod, setProd] = useState<ProductionData>({
    initialPrompt: "",
    enhancedPrompt: "",
    targetPlatform: SocialPlatform.TIKTOK,
    groundingSources: []
  });
  
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHub, setShowHub] = useState(false);
  const [showBrandPanel, setShowBrandPanel] = useState(false);
  const [hubItems, setHubItems] = useState<ApprovedMedia[]>(() => loadMediaHub());
  const [activeBrandSession, setActiveBrandSession] = useState<BrandSession | null>(null);
  const [brandChunks, setBrandChunks] = useState<BrandChunk[]>([]);

  const refreshHub = useCallback(() => setHubItems(loadMediaHub()), []);

  useEffect(() => {
    if (activeBrandSession) {
      ragService.getChunksBySession(activeBrandSession.id).then(setBrandChunks);
    } else {
      setBrandChunks([]);
    }
  }, [activeBrandSession]);

  const startProduction = async (
    prompt: string, 
    ar: AspectRatio, 
    platform: SocialPlatform, 
    manualMusic: MusicTrack | null,
    productImages: ImageFile[],
    logo: ImageFile | null
  ) => {
    setAspectRatio(ar);
    setProd({ 
      initialPrompt: prompt, 
      enhancedPrompt: "", 
      targetPlatform: platform, 
      groundingSources: [],
      selectedMusic: manualMusic || undefined,
      productAssets: productImages,
      logo: logo || undefined
    });
    
    try {
      // 0. FETCH CONTEXT (RAG)
      // 0. FETCH CONTEXT (RAG)
      const getContext = (q: string, intent: any = 'general') => {
        if (!activeBrandSession || brandChunks.length === 0) return "";
        const relevant = ragService.searchChunks(q, brandChunks, 5, { intent });
        return ragService.formatContextForPrompt(relevant);
      };

      // 1. ORCHESTRATING
      setAppState(AppState.ORCHESTRATING);
      const orchestratorContext = getContext(prompt, 'marketing');
      const { enhancedPrompt, musicMood, recommendedGenre, strategy } = await orchestrate(
        prompt,
        settings,
        platform,
        productImages,
        logo || undefined,
        orchestratorContext
      );
      
      let finalMusic = manualMusic || PRESET_TRACKS.find(t => t.id === recommendedGenre) || PRESET_TRACKS[0];

      setProd(prev => ({ 
        ...prev, 
        enhancedPrompt, 
        selectedMusic: finalMusic,
        musicMoodSuggestion: musicMood
      }));
      
      // 2. MARKETING
      setAppState(AppState.MARKETING);
      const marketingContext = getContext(`${prompt} ${enhancedPrompt}`, 'marketing');
      const { copy, sources } = await marketAnalysis(
        enhancedPrompt,
        prompt,
        settings,
        platform,
        productImages,
        logo || undefined,
        marketingContext
      );
      setProd(prev => ({ ...prev, marketingCopy: copy, groundingSources: sources }));

      // 3. DIRECTOR
      setAppState(AppState.DIRECTING);
      const directorContext = getContext(`${copy} ${strategy}`, 'visual');
      const templateMapping = await directorAgent(
        copy,
        enhancedPrompt,
        settings,
        platform,
        directorContext
      );
      setProd(prev => ({ ...prev, templateMapping }));

      // 4. MEDIA_GEN (Blotato)
      setAppState(AppState.MEDIA_GEN);
      const mediaResult = await generateMediaBlotato(templateMapping, settings);
      setProd(prev => ({ ...prev, videoUrl: mediaResult.url }));

      // 5. VALIDATION
      setAppState(AppState.VALIDATION);
      const qaContext = getContext(`Check alignment for: ${copy}`, 'qa');
      const validationResult = await validationAgent(mediaResult.url, copy, settings, qaContext);
      setProd(prev => ({ ...prev, validationResult }));

      // 6. DECISION
      setAppState(AppState.DECISION);
      
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const handlePublish = async () => {
    try {
      setAppState(AppState.PUBLISHING);
      await publishBlotato(prod.marketingCopy || '', prod.videoUrl || '', prod.targetPlatform, settings);
      // ★ Save to Media Hub on approval
      approveAndSave({ ...prod, finalVideoUrl: prod.videoUrl, fallbackUsed: prod.fallbackUsed });
      refreshHub();
      setAppState(AppState.COMPLETED);
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  const handleSchedule = async () => {
    try {
      setAppState(AppState.SCHEDULING);
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await scheduleBlotato(prod.marketingCopy || '', prod.videoUrl || '', prod.targetPlatform, futureDate, settings);
      // ★ Also save scheduled media to hub
      approveAndSave({ ...prod, finalVideoUrl: prod.videoUrl, fallbackUsed: prod.fallbackUsed });
      refreshHub();
      setAppState(AppState.COMPLETED);
    } catch (e: any) {
      setErrorMessage(e.message);
      setAppState(AppState.ERROR);
    }
  };

  if (!currentUser) return <AuthPage onLogin={setCurrentUser} />;

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
        
        <div className="flex items-center gap-3">
          {(!settings.apiKey || !settings.blotatoApiKey) && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> Configuration Incomplète
            </div>
          )}
          {/* Media Hub button with badge */}
          <button
            onClick={() => { setShowHub(h => !h); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold ${
              showHub
                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                : 'bg-[#111] border-gray-800 text-gray-400 hover:text-white hover:border-violet-500/50'
            }`}
          >
            <Library size={16} />
            Hub
            {hubItems.length > 0 && (
              <span className="bg-violet-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">
                {hubItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setShowBrandPanel(p => !p); setShowHub(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-semibold ${
              showBrandPanel
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-[#111] border-gray-800 text-gray-400 hover:text-white hover:border-indigo-500/50'
            }`}
          >
            <UsersIcon size={16} />
            {activeBrandSession ? activeBrandSession.name : 'Knowledge'}
          </button>
            <button 
              onClick={() => {
                authService.signOut();
                setCurrentUser(null);
              }}
              className="px-4 py-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 rounded-xl text-sm font-medium transition-all"
            >
              Déconnexion
            </button>
            <button
              onClick={() => setAppState(AppState.SETTINGS)}
            className="p-3 hover:bg-gray-900 rounded-xl transition-colors border border-gray-800 relative"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        <div className={`flex-grow flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${showBrandPanel ? 'opacity-50 pointer-events-none' : ''}`}>
          {appState === AppState.SETTINGS ? (
            <SettingsPage settings={settings} onSave={handleSaveSettings} />
          ) : showHub ? (
            <MediaHub
              items={hubItems}
              onRefresh={refreshHub}
              onReuseAsTemplate={(item) => {
                setShowHub(false);
                setAppState(AppState.IDLE);
                setProd(prev => ({ ...prev, initialPrompt: item.enhancedPrompt }));
              }}
            />
          ) : (
            <div className="max-w-6xl mx-auto w-full p-8 flex flex-col flex-grow">
              {/* ... (rest of main UI) */}
              {appState === AppState.IDLE && (
                <div className="flex-grow flex flex-col items-center justify-center py-10 animate-in fade-in duration-1000">
                  <div className="text-center mb-10">
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">AI CAMPAIGN STUDIO</h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto italic font-medium leading-relaxed">
                      Votre système d'exploitation créatif <span className="text-indigo-400 font-bold">industrialisé</span>.
                      {activeBrandSession && <span className="block mt-2 text-sm text-indigo-300/60 uppercase tracking-widest font-black">Context actif : {activeBrandSession.name}</span>}
                    </p>
                  </div>
                  <PromptForm onSubmit={startProduction} />
                </div>
              )}
              {/* (The existing UI sections follow here - omitting for brevity in ReplacementChunk but ensuring they are kept) */}
              
              {(appState >= AppState.ORCHESTRATING && appState <= AppState.VALIDATION) && (
                <div className="flex-grow flex flex-col items-center justify-center gap-12">
                  <div className="animate-pulse text-indigo-400 text-xl font-bold tracking-widest uppercase">
                    {AppState[appState]}...
                  </div>
                  <LoadingIndicator state={appState} />
                </div>
              )}

              {appState === AppState.DECISION && (
                <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-8">
                  <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Campaign Ready for Review</h3>
                        <p className="text-gray-400 text-sm">Please review the validation score and generated content.</p>
                      </div>
                      {prod.validationResult && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${prod.validationResult.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {prod.validationResult.passed ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                          {prod.validationResult.passed ? 'PASSED QA' : 'FAILED QA'}
                        </div>
                      )}
                    </div>
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-gray-800 mb-6 font-mono text-sm">
                      <p className="text-gray-400 mb-2"><strong>Visual Quality:</strong> {prod.validationResult?.visual_quality}/10</p>
                      <p className="text-gray-400 mb-2"><strong>Message Alignment:</strong> {prod.validationResult?.message_alignment}/10</p>
                      <p className="text-gray-400 mb-2"><strong>CTA Present:</strong> {prod.validationResult?.cta_present ? 'Yes' : 'No'}</p>
                      <p className="text-indigo-300 mt-4 italic"><strong>Copy:</strong> {prod.marketingCopy}</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={handlePublish} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"><Send size={18} /> Publish</button>
                      <button onClick={handleSchedule} className="flex-1 py-4 bg-[#1a1a1a] hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"><Calendar size={18} /> Schedule</button>
                      <button onClick={() => setAppState(AppState.IDLE)} className="py-4 px-6 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-xl font-bold">Reject</button>
                    </div>
                  </div>
                </div>
              )}

              {appState === AppState.COMPLETED && (
                <div className="flex-grow flex flex-col items-center justify-center gap-8">
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="text-emerald-400 w-12 h-12" /></div>
                  <h2 className="text-4xl font-black text-white text-center">CAMPAIGN DEPLOYED</h2>
                  <button onClick={() => setAppState(AppState.IDLE)} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all flex items-center gap-2"><RefreshCw size={18} /> New Campaign</button>
                </div>
              )}

              {appState === AppState.ERROR && (
                <div className="flex-grow flex flex-col items-center justify-center gap-8 max-w-xl mx-auto text-center">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_50px_rgba(239,68,68,0.3)] border border-red-500/30"><AlertTriangle className="text-red-400 w-10 h-10" /></div>
                  <div>
                    <h2 className="text-3xl font-black text-white mb-4 uppercase">SYSTEM ERROR</h2>
                    <p className="text-gray-400 text-lg bg-[#111] p-6 rounded-2xl border border-gray-800 font-mono text-sm leading-relaxed text-left">{errorMessage}</p>
                  </div>
                  <button onClick={() => setAppState(AppState.IDLE)} className="mt-4 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl flex items-center gap-2"><RefreshCw size={18} /> Recommencer</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brand Context Side Panel */}
        <div className={`transition-all duration-500 ease-in-out border-l border-white/5 ${showBrandPanel ? 'w-[400px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
           <BrandContextPanel 
             apiKey={settings.apiKey} 
             user={currentUser!}
             onSessionChange={setActiveBrandSession} 
           />
        </div>
      </main>
    </div>
  );
};

export default App;
