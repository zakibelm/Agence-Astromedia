import React, { useState } from 'react';
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  UserIcon, 
  RocketLaunchIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import * as authService from '../services/authService';
import { User } from '../types';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        const user = await authService.signIn(email, password);
        onLogin(user);
      } else if (mode === 'signup') {
        const user = await authService.signUp(email, password, fullName);
        onLogin(user);
      } else {
        await authService.resetPassword(email);
        setSuccess('Un lien de réinitialisation a été envoyé à votre adresse email.');
        setTimeout(() => setMode('signin'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020203] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Deep Space Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6 group transform transition-transform hover:scale-110 duration-500">
            <RocketLaunchIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 italic">ASTROMÉDIA</h1>
          <p className="text-white/40 text-sm font-medium tracking-wide uppercase">Creative Agentic OS</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl shadow-black/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'signin' ? 'Bon retour' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
            </h2>
            <p className="text-white/40 text-sm">
              {mode === 'signin' ? 'Connectez-vous pour piloter vos agents.' : mode === 'signup' ? 'Commencez à industrialiser votre créativité.' : 'Entrez votre email pour recevoir un lien.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/30 uppercase ml-4 tracking-widest">Nom complet</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/30 uppercase ml-4 tracking-widest">Email</label>
              <div className="relative group">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@agence.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mot de passe</label>
                  {mode === 'signin' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">Oublié ?</button>
                  )}
                </div>
                <div className="relative group">
                  <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                <p>{success}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group overflow-hidden relative"
            >
              <div className={`absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out`} />
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">{mode === 'signin' ? 'Décollage' : mode === 'signup' ? 'Rejoindre l\'équipage' : 'Réinitialiser'}</span>
                  <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-white/30 text-sm">
              {mode === 'signin' ? "Nouveau chez Astromédia ?" : "Déjà membre ?"}
              <button 
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="ml-2 font-bold text-white hover:text-indigo-400 transition-colors"
              >
                {mode === 'signin' ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-white/10 uppercase tracking-[0.2em] font-medium">
          Powered by Advanced Agentic Intelligence
        </p>
      </div>
    </div>
  );
};
