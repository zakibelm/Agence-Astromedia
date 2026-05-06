// services/apiClient.ts — single source of truth for backend calls.
// Sends both:
//   - x-astromedia-key  (anti-bot proxy key, env-injected)
//   - Authorization: Bearer <jwt>  (Supabase user token)
import { getAccessToken } from './authService';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) ?? '/api';
const PROXY_KEY = (import.meta.env.VITE_BACKEND_PROXY_KEY as string) ?? '';

if (!PROXY_KEY) {
  console.warn(
    '[apiClient] VITE_BACKEND_PROXY_KEY is empty — backend calls will be rejected.',
  );
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const apiPost = async <T = unknown>(path: string, body: unknown): Promise<T> => {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;

  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-astromedia-key': PROXY_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `HTTP ${res.status}`, payload?.details);
  }
  return payload as T;
};

export const apiGet = async <T = unknown>(path: string): Promise<T> => {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;

  const token = await getAccessToken();
  const headers: Record<string, string> = { 'x-astromedia-key': PROXY_KEY };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }
  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `HTTP ${res.status}`, payload?.details);
  }
  return payload as T;
};
