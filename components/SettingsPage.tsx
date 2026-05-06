/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Key, Eye, EyeOff, Bot, ImageIcon, Save, ChevronDown, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../types';

const TEXT_MODELS = [
  { id: 'google/gemini-2.5-pro',               label: 'Gemini 2.5 Pro',          provider: 'Google' },
  { id: 'google/gemini-2.5-flash',              label: 'Gemini 2.5 Flash',         provider: 'Google' },
  { id: 'anthropic/claude-opus-4',              label: 'Claude Opus 4',            provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4-5',          label: 'Claude Sonnet 4.5',        provider: 'Anthropic' },
  { id: 'openai/gpt-4o',                        label: 'GPT-4o',                   provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini',                   label: 'GPT-4o Mini',              provider: 'OpenAI' },
  { id: 'meta-llama/llama-3.3-70b-instruct',    label: 'Llama 3.3 70B',            provider: 'Meta' },
];

const IMAGE_MODELS = [
  { id: 'openai/dall-e-3',                      label: 'DALL-E 3',                 provider: 'OpenAI' },
  { id: 'black-forest-labs/flux-1.1-pro',       label: 'FLUX 1.1 Pro',             provider: 'Black Forest Labs' },
  { id: 'black-forest-labs/flux-schnell',       label: 'FLUX Schnell (rapide)',    provider: 'Black Forest Labs' },
];

const VIDEO_MODELS = [
  { id: 'kwaivgi/kling-v3.0-pro',               label: 'Kling v3.0 Pro',           provider: 'Kuaishou' },
  { id: 'minimax/hailuo-2.3',                   label: 'Hailuo 2.3',               provider: 'MiniMax' },
];

const AGENTS = [
  { key: 'orchestratorPersona', label: 'Orchestrateur', desc: 'Transforme le brief en vision cinématique + recommande la musique' },
  { key: 'marketerPersona',     label: 'Marketeur',     desc: 'Analyse les tendances et rédige le copywriting de la campagne' },
  { key: 'directorPersona',     label: 'Réalisateur',   desc: 'Supervise la direction artistique et la cohérence visuelle' },
] as const;

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

const ModelSelect: React.FC<{
  label: string;
  value: string;
  options: typeof TEXT_MODELS;
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-black/50 border border-gray-800 rounded-xl px-4 py-3 pr-10 text-sm focus:border-indigo-500 outline-none cursor-pointer"
      >
        {options.map(m => (
          <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
    <p className="text-[10px] text-gray-600 font-mono">{value}</p>
  </div>
);

const SettingsPage: React.FC<Props> = ({ settings, onSave }) => {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const apiKeyMissing = !draft.apiKey.trim();
  const blotatoApiKeyMissing = !draft.blotatoApiKey.trim();

  return (
    <div className="flex-grow flex flex-col items-center p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 gap-8 overflow-y-auto custom-scrollbar pb-16">

      {/* Header */}
      <div className="self-start">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Paramètres</h2>
        <p className="text-gray-500 text-sm mt-1">Configuration de votre studio IA</p>
      </div>

      {/* Section Clé API */}
      <section className="w-full bg-[#111] border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
          <Key size={14} /> Clé API OpenRouter (Orchestrateur & Marketeur)
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={draft.apiKey}
            onChange={e => update('apiKey', e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 pr-12 text-sm font-mono focus:border-indigo-500 outline-none placeholder:text-gray-700"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {apiKeyMissing && (
          <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
            <AlertTriangle size={13} />
            Aucune clé API renseignée — le studio ne peut pas générer de contenu.
          </div>
        )}

        <p className="text-xs text-gray-600">
          Créez votre clé sur{' '}
          <span className="text-indigo-400 font-mono">openrouter.ai/keys</span>
          {' '}— elle est stockée uniquement dans votre navigateur (localStorage).
        </p>

        <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-widest mt-4">
          <Key size={14} /> Clé API Blotato (Créateur Média & Diffusion)
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={draft.blotatoApiKey}
            onChange={e => update('blotatoApiKey', e.target.value)}
            placeholder="blt_..."
            className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 pr-12 text-sm font-mono focus:border-orange-500 outline-none placeholder:text-gray-700"
          />
        </div>

        {blotatoApiKeyMissing && (
          <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
            <AlertTriangle size={13} />
            Aucune clé API Blotato renseignée — la création média et la diffusion ne fonctionneront pas.
          </div>
        )}
      </section>

      {/* Section Modèles */}
      <section className="w-full bg-[#111] border border-gray-800 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
          <Bot size={14} /> Modèles IA
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModelSelect
            label="Modèle Texte (orchestrateur · marketeur)"
            value={draft.textModel}
            options={TEXT_MODELS}
            onChange={v => update('textModel', v)}
          />
          <ModelSelect
            label="Modèle Génération d'image"
            value={draft.imageModel}
            options={IMAGE_MODELS}
            onChange={v => update('imageModel', v)}
          />
          <ModelSelect
            label="Modèle Génération Vidéo"
            value={draft.videoModel || 'kwaivgi/kling-v3.0-pro'}
            options={VIDEO_MODELS}
            onChange={v => update('videoModel', v)}
          />
        </div>
      </section>

      {/* Section Prompts Système */}
      <section className="w-full bg-[#111] border border-gray-800 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
          <ImageIcon size={14} /> Prompts Système des Agents
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AGENTS.map(agent => (
            <div key={agent.key} className="flex flex-col gap-2">
              <div>
                <label className="text-xs text-white font-bold uppercase tracking-wider">{agent.label}</label>
                <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{agent.desc}</p>
              </div>
              <textarea
                className="bg-black/50 border border-gray-800 rounded-xl p-3 text-xs min-h-[160px] focus:border-indigo-500 outline-none resize-none leading-relaxed text-gray-300"
                value={draft[agent.key]}
                onChange={e => update(agent.key, e.target.value)}
                placeholder={`Persona pour l'agent ${agent.label}...`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <button
        onClick={() => onSave(draft)}
        disabled={apiKeyMissing || blotatoApiKeyMissing}
        className="px-12 py-4 bg-white text-black font-bold rounded-full hover:bg-indigo-400 hover:text-white transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-black"
      >
        <Save size={18} /> Sauvegarder & Retour
      </button>
    </div>
  );
};

export default SettingsPage;
