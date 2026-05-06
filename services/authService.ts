// services/authService.ts — real auth via Supabase. Passwords hashed server-side.
import { Session } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase } from './supabaseClient';

const toUser = (session: Session | null): User | null => {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? '',
    fullName: (u.user_metadata?.full_name as string) ?? undefined,
    avatarUrl: (u.user_metadata?.avatar_url as string) ?? undefined,
    createdAt: u.created_at,
  };
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getSession();
  return toUser(data.session);
};

export const onAuthChange = (cb: (user: User | null) => void) => {
  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toUser(session));
  });
  return () => subscription.subscription.unsubscribe();
};

export const signUp = async (
  email: string,
  password: string,
  fullName?: string,
): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: fullName ? { full_name: fullName } : undefined },
  });
  if (error) throw new Error(error.message);
  const user = toUser(data.session);
  if (!user) {
    // Email confirmation required — Supabase returns no session yet
    throw new Error('Vérifiez votre email pour confirmer votre compte.');
  }
  return user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Email ou mot de passe incorrect.');
  const user = toUser(data.session);
  if (!user) throw new Error('Connexion impossible.');
  return user;
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const resetPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
};

/**
 * Returns the current Supabase JWT for backend calls.
 * Refreshes automatically — never read access_token directly from localStorage.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
