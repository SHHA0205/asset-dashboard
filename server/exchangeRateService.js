import { fetchJson } from './httpClient.js';

const CACHE_TTL_MS = 30 * 60 * 1000;
let rateCache = null;

export function getCachedExchangeRate() {
  return rateCache;
}

async function fetchFromErApi() {
  const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
  if (!data?.rates?.KRW) throw new Error('er-api: no KRW rate');
  return data.rates.KRW;
}

async function fetchFromFrankfurter() {
  const data = await fetchJson('https://api.frankfurter.app/latest?from=USD&to=KRW');
  if (!data?.rates?.KRW) throw new Error('frankfurter: no KRW rate');
  return data.rates.KRW;
}

async function fetchFromYahooChart() {
  const data = await fetchJson(
    'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d',
  );
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error('yahoo chart: no KRW rate');
  return price;
}

const PROVIDERS = [
  { name: 'er-api', fn: fetchFromErApi },
  { name: 'yahoo', fn: fetchFromYahooChart },
  { name: 'frankfurter', fn: fetchFromFrankfurter },
];

export async function fetchExchangeRate() {
  const now = Date.now();
  if (rateCache && now - new Date(rateCache.fetchedAt).getTime() < CACHE_TTL_MS) {
    return { rate: rateCache.rate, fetchedAt: rateCache.fetchedAt, error: null, source: rateCache.source };
  }

  const errors = [];

  for (const { name, fn } of PROVIDERS) {
    try {
      const rate = await fn();
      const fetchedAt = new Date().toISOString();
      rateCache = { rate, fetchedAt, source: name };
      console.log(`Exchange rate: ${rate} (${name})`);
      return { rate, fetchedAt, error: null, source: name };
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.warn(`FX provider ${name} failed:`, err.message);
    }
  }

  if (rateCache) {
    return {
      rate: rateCache.rate,
      fetchedAt: rateCache.fetchedAt,
      source: rateCache.source,
      error: '환율 갱신 실패 — 마지막 캐시 데이터를 표시합니다.',
    };
  }

  return {
    rate: null,
    fetchedAt: null,
    source: null,
    error: `환율 조회 실패: ${errors.join('; ')}`,
  };
}