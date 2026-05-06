import React, { useState, useMemo } from 'react';
import {
  Library, Star, TrendingUp, Trash2, Copy, Play, Filter,
  ArrowUpDown, ExternalLink, Zap, Target, Eye, ChevronDown
} from 'lucide-react';
import { ApprovedMedia, SocialPlatform } from '../types';
import { deleteFromHub, incrementUsage } from '../services/mediaHubService';

interface MediaHubProps {
  items: ApprovedMedia[];
  onRefresh: () => void;
  onReuseAsTemplate: (item: ApprovedMedia) => void;
}

type SortKey = 'date' | 'qa' | 'usage';

const PLATFORM_COLORS: Record<string, string> = {
  [SocialPlatform.TIKTOK]: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  [SocialPlatform.INSTAGRAM]: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  [SocialPlatform.YOUTUBE_SHORTS]: 'bg-red-500/20 text-red-300 border-red-500/30',
  [SocialPlatform.YOUTUBE]: 'bg-red-500/20 text-red-300 border-red-500/30',
  [SocialPlatform.FACEBOOK]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  [SocialPlatform.LINKEDIN]: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  [SocialPlatform.X]: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const ScoreBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>{label}</span>
      <span className="font-bold text-white">{value}/10</span>
    </div>
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value * 10}%` }}
      />
    </div>
  </div>
);

const QaBadge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 8 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : score >= 6 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-red-400 bg-red-500/10 border-red-500/30';
  const stars = Math.round(score / 2);

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${color}`}>
      <Star size={11} fill="currentColor" />
      {score.toFixed(1)}
      <span className="opacity-60">({Array(stars).fill('★').join('')})</span>
    </div>
  );
};

const MediaCard: React.FC<{
  item: ApprovedMedia;
  onDelete: (id: string) => void;
  onReuse: (item: ApprovedMedia) => void;
}> = ({ item, onDelete, onReuse }) => {
  const [expanded, setExpanded] = useState(false);
  const isVideo = item.mediaUrl.endsWith('.mp4') || item.mediaUrl.includes('video');
  const formattedDate = new Date(item.approvedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="group bg-[#0e0e0e] border border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col">
      {/* Media Preview */}
      <div className="relative bg-[#070707] aspect-video flex items-center justify-center border-b border-gray-800 overflow-hidden">
        {isVideo ? (
          <video
            src={item.mediaUrl}
            className="w-full h-full object-cover"
            muted
            loop
            onMouseEnter={e => (e.target as HTMLVideoElement).play()}
            onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : (
          <img
            src={item.mediaUrl}
            alt="Generated media"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <a
            href={item.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
            title="Ouvrir"
          >
            <ExternalLink size={18} className="text-white" />
          </a>
          {isVideo && (
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all">
              <Play size={18} className="text-white" />
            </button>
          )}
        </div>
        {/* Platform badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold border ${PLATFORM_COLORS[item.platform] ?? 'bg-gray-800 text-gray-300 border-gray-700'}`}>
          {item.platform}
        </div>
        {item.fallbackUsed && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
            Fallback
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <QaBadge score={item.qaScore} />
          <span className="text-xs text-gray-500">{formattedDate}</span>
        </div>

        {/* Copy preview */}
        <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3 flex-grow">
          {item.marketingCopy || item.enhancedPrompt}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-xs rounded-full border border-indigo-500/20">
              {tag}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 border-t border-gray-800 pt-3">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {item.validationResult.visual_quality}/10 visual
          </span>
          <span className="flex items-center gap-1">
            <Target size={12} /> {item.validationResult.message_alignment}/10 copy
          </span>
          <span className="flex items-center gap-1">
            <Zap size={12} /> ×{item.usageCount} réutilisé
          </span>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Masquer les détails' : 'Voir les scores QA complets'}
        </button>

        {expanded && (
          <div className="bg-[#080808] rounded-xl p-4 border border-gray-800 mb-4 space-y-1">
            <ScoreBar label="Qualité visuelle" value={item.validationResult.visual_quality} color="bg-indigo-500" />
            <ScoreBar label="Alignement message" value={item.validationResult.message_alignment} color="bg-emerald-500" />
            <ScoreBar label="Cohérence de marque" value={item.validationResult.brand_consistency} color="bg-violet-500" />
            <div className="pt-2 text-xs text-gray-500 border-t border-gray-800 mt-2">
              <strong className="text-indigo-300">Stratégie :</strong> {item.strategy}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onReuse(item)}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Copy size={14} /> Réutiliser
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2.5 bg-red-900/10 hover:bg-red-900/30 text-red-400 rounded-xl border border-red-900/20 transition-all"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main MediaHub component ────────────────────────────────────────
const MediaHub: React.FC<MediaHubProps> = ({ items, onRefresh, onReuseAsTemplate }) => {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterMinScore, setFilterMinScore] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const platforms = useMemo(() =>
    ['all', ...Array.from(new Set(items.map(i => i.platform)))],
    [items]
  );

  const sorted = useMemo(() => {
    return [...items]
      .filter(i => filterPlatform === 'all' || i.platform === filterPlatform)
      .filter(i => i.qaScore >= filterMinScore)
      .filter(i => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return i.marketingCopy?.toLowerCase().includes(q) ||
          i.enhancedPrompt?.toLowerCase().includes(q) ||
          i.strategy?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortKey === 'qa') return b.qaScore - a.qaScore;
        if (sortKey === 'usage') return b.usageCount - a.usageCount;
        return new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime();
      });
  }, [items, sortKey, filterPlatform, filterMinScore, searchQuery]);

  const handleDelete = (id: string) => {
    deleteFromHub(id);
    onRefresh();
  };

  const handleReuse = (item: ApprovedMedia) => {
    incrementUsage(item.id);
    onRefresh();
    onReuseAsTemplate(item);
  };

  const avgScore = items.length
    ? (items.reduce((acc, i) => acc + i.qaScore, 0) / items.length).toFixed(1)
    : '—';
  const topPlatform = items.length
    ? Object.entries(items.reduce((acc: Record<string, number>, i) => {
        acc[i.platform] = (acc[i.platform] ?? 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    : '—';

  return (
    <div className="w-full px-8 py-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center">
          <Library className="text-violet-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Media Hub</h2>
          <p className="text-gray-400 text-sm">Bibliothèque des campagnes approuvées — inspirez-vous des meilleures performances.</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Médias approuvés', value: items.length, icon: <Library size={16} />, color: 'text-indigo-400' },
          { label: 'Score QA moyen', value: avgScore, icon: <Star size={16} />, color: 'text-emerald-400' },
          { label: 'Plateforme top', value: topPlatform, icon: <TrendingUp size={16} />, color: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0e0e0e] border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
            <div className={`${stat.color} opacity-80`}>{stat.icon}</div>
            <div>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl">
        <div className="flex items-center gap-2 text-gray-400 text-sm mr-2">
          <Filter size={14} /> Filtres
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher dans les copies..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-[#111] border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {/* Platform filter */}
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {platforms.map(p => (
            <option key={p} value={p}>{p === 'all' ? 'Toutes les plateformes' : p}</option>
          ))}
        </select>

        {/* Min score */}
        <select
          value={filterMinScore}
          onChange={e => setFilterMinScore(Number(e.target.value))}
          className="bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          <option value={0}>Score min : Tous</option>
          <option value={6}>Score ≥ 6</option>
          <option value={7}>Score ≥ 7</option>
          <option value={8}>Score ≥ 8 ⭐</option>
          <option value={9}>Score ≥ 9 🏆</option>
        </select>

        {/* Sort */}
        <div className="flex items-center gap-1 bg-[#111] border border-gray-700 rounded-xl px-3 py-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-transparent text-sm text-gray-200 focus:outline-none"
          >
            <option value="date">Plus récent</option>
            <option value="qa">Meilleur score QA</option>
            <option value="usage">Plus réutilisé</option>
          </select>
        </div>
      </div>

      {/* Grid or empty state */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-3xl flex items-center justify-center mb-6">
            <Library className="text-violet-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {items.length === 0 ? 'Bibliothèque vide' : 'Aucun résultat'}
          </h3>
          <p className="text-gray-400 text-sm max-w-md">
            {items.length === 0
              ? 'Lancez votre première campagne et approuvez-la pour la voir apparaître ici.'
              : 'Essayez d\'ajuster vos filtres pour trouver ce que vous cherchez.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onReuse={handleReuse}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaHub;
