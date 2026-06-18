import { fetchJson, yahooFetchJson } from './httpClient.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const quoteCache = new Map();

export function toYahooSymbol(ticker, market) {
  const upper = ticker.toUpperCase();
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) return upper;
  if (/^\d{6}$/.test(ticker)) {
    const m = (market || '').toUpperCase();
    if (m.includes('KOSDAQ') || m === 'KQ') return `${ticker}.KQ`;
    return `${ticker}.KS`;
  }
  return upper;
}

async function fetchChartQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=true`;
  const data = await fetchJson(url);
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  const price =
    meta.regularMarketPrice ??
    meta.previousClose ??
    meta.chartPreviousClose ??
    null;

  if (price == null) return null;

  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prev;
  const changePercent = prev ? (change / prev) * 100 : 0;

  return {
    symbol: meta.symbol || symbol,
    price,
    currency: meta.currency || (symbol.endsWith('.KS') || symbol.endsWith('.KQ') ? 'KRW' : 'USD'),
    change,
    changePercent,
    shortName: meta.longName || meta.shortName || symbol,
  };
}

async function fetchBatchQuotes(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const data = await yahooFetchJson(url);
  const results = data?.quoteResponse?.result || [];

  return results.map((item) => ({
    symbol: item.symbol,
    price: item.regularMarketPrice ?? item.postMarketPrice ?? item.preMarketPrice ?? null,
    currency: item.currency || 'USD',
    change: item.regularMarketChange ?? 0,
    changePercent: item.regularMarketChangePercent ?? 0,
    shortName: item.shortName || item.longName || item.symbol,
  }));
}

async function fetchYahooQuotes(symbols) {
  const unique = [...new Set(symbols)];

  try {
    const batch = await fetchBatchQuotes(unique);
    const valid = batch.filter((q) => q.price != null);
    if (valid.length === unique.length) return valid;
  } catch {
    // fall through to per-symbol chart API
  }

  const results = await Promise.all(
    unique.map(async (symbol) => {
      try {
        return await fetchChartQuote(symbol);
      } catch (err) {
        console.warn(`Chart quote failed for ${symbol}:`, err.message);
        return null;
      }
    }),
  );

  return results.filter(Boolean);
}

export function getCachedQuotes(symbols) {
  const now = Date.now();
  return symbols
    .map((s) => quoteCache.get(s))
    .filter((c) => c && now - new Date(c.fetchedAt).getTime() < CACHE_TTL_MS * 12)
    .map((c) => c.data);
}

export async function fetchQuotes(symbols) {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return { quotes: [], error: null };

  const now = Date.now();
  const stale = [];
  const fresh = [];

  for (const symbol of unique) {
    const cached = quoteCache.get(symbol);
    if (cached && now - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
      fresh.push(cached.data);
    } else {
      stale.push(symbol);
    }
  }

  if (stale.length === 0) {
    return { quotes: fresh, error: null };
  }

  try {
    const fetched = await fetchYahooQuotes(stale);
    const fetchedAt = new Date().toISOString();

    for (const quote of fetched) {
      const entry = { ...quote, fetchedAt };
      quoteCache.set(quote.symbol, { data: entry, fetchedAt });
      fresh.push(entry);
    }

    for (const symbol of stale) {
      if (!fetched.find((q) => q.symbol === symbol)) {
        const cached = quoteCache.get(symbol);
        if (cached) fresh.push(cached.data);
      }
    }

    const got = new Set(fresh.map((q) => q.symbol));
    const missing = stale.filter((s) => !got.has(s));

    return {
      quotes: fresh,
      error: missing.length > 0 ? `일부 종목 시세 조회 실패: ${missing.join(', ')}` : null,
    };
  } catch (error) {
    console.error('fetchQuotes error:', error.message);
    const cached = getCachedQuotes(stale);
    return {
      quotes: [...fresh, ...cached],
      error:
        cached.length > 0
          ? '시세 갱신 실패 — 마지막 캐시 데이터를 표시합니다.'
          : `시세 조회 실패: ${error.message}`,
    };
  }
}