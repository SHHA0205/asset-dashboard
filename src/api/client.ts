import type { PriceSnapshot, SearchResult } from '../types';

const API_BASES = [
  '/api',
  ...(import.meta.env.DEV
    ? ['http://localhost:3001/api', 'http://127.0.0.1:3001/api']
    : []),
];

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('API 서버에 연결할 수 없습니다.');
}

export async function checkApiHealth() {
  const res = await apiFetch('/health');
  return res.json();
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const res = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

export async function fetchQuotes(symbols: string[]): Promise<{
  quotes: PriceSnapshot[];
  error: string | null;
}> {
  const res = await apiFetch('/quotes', {
    method: 'POST',
    body: JSON.stringify({ symbols }),
  });
  const data = await res.json();
  const quotes: PriceSnapshot[] = (data.quotes || []).map(
    (q: {
      symbol: string;
      price: number;
      currency: string;
      change: number;
      changePercent: number;
      fetchedAt: string;
    }) => ({
      symbol: q.symbol,
      current_price: q.price,
      currency: q.currency as 'KRW' | 'USD',
      change: q.change,
      changePercent: q.changePercent,
      fetched_at: q.fetchedAt,
    }),
  );
  return { quotes, error: data.error || null };
}

export async function fetchExchangeRate(): Promise<{
  rate: number;
  fetchedAt: string;
  error: string | null;
}> {
  const res = await apiFetch('/exchange-rate');
  const data = await res.json();
  return {
    rate: data.rate,
    fetchedAt: data.fetchedAt,
    error: data.error || null,
  };
}