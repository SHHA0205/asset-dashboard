import type { Account, Holding, OtherAsset, SearchResult } from '../types';

const TOKEN_KEY = 'asset_dashboard_token';
const LOCAL_ONLY_KEY = 'asset_dashboard_local_only';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isLocalOnly(): boolean {
  return sessionStorage.getItem(LOCAL_ONLY_KEY) === '1';
}

export function setLocalOnly(value: boolean) {
  if (value) sessionStorage.setItem(LOCAL_ONLY_KEY, '1');
  else sessionStorage.removeItem(LOCAL_ONLY_KEY);
}

const AUTH_BASES = [
  '/api/auth',
  ...(import.meta.env.DEV ? ['http://localhost:3001/api/auth'] : []),
];

async function authFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError: Error | null = null;
  for (const base of AUTH_BASES) {
    try {
      const res = await fetch(`${base}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '요청 실패');
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error('서버에 연결할 수 없습니다.');
}

export async function register(username: string, password: string) {
  return authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }) as Promise<{ token: string; user: { id: string; username: string } }>;
}

export async function login(username: string, password: string) {
  return authFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }) as Promise<{ token: string; user: { id: string; username: string } }>;
}

export async function fetchRemotePortfolio(): Promise<{
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  recentSearches: SearchResult[];
  updatedAt: string | null;
}> {
  return authFetch('/portfolio');
}

export async function pushRemotePortfolio(data: {
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  recentSearches: SearchResult[];
}) {
  return authFetch('/portfolio', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}