import { fetchJson } from './httpClient.js';

const MARKET_LABELS = {
  ksc: 'KOSPI',
  koe: 'KOSDAQ',
  ksn: 'KOSPI',
  ksq: 'KOSDAQ',
  nms: 'NASDAQ',
  nyq: 'NYSE',
  arca: 'ARCA',
  bts: 'BATS',
};

function getMarketBadge(item) {
  const exchange = (item.exchange || '').toUpperCase();
  if (MARKET_LABELS[exchange.toLowerCase()]) return MARKET_LABELS[exchange.toLowerCase()];
  if (exchange.includes('SEOUL') || exchange === 'KSC') return 'KOSPI';
  if (exchange === 'KOE' || exchange === 'KSQ') return 'KOSDAQ';
  if (exchange === 'NMS') return 'NASDAQ';
  if (exchange === 'NYQ') return 'NYSE';
  return exchange || 'OTHER';
}

function getCurrency(symbol, market) {
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || /^\d{6}$/.test(symbol)) return 'KRW';
  if (['KOSPI', 'KOSDAQ', 'KRX'].some((m) => market.includes(m))) return 'KRW';
  return 'USD';
}

function normalizeResult(item) {
  const symbol = item.symbol || '';
  const market = getMarketBadge(item);
  const currency = getCurrency(symbol, market);
  const isKorean = currency === 'KRW';
  const displayTicker = isKorean ? symbol.replace(/\.(KS|KQ)$/, '') : symbol;

  return {
    symbol,
    ticker: displayTicker,
    name: item.longname || item.shortname || symbol,
    market,
    exchange: item.exchDisp || item.exchange || market,
    currency,
    quoteType: item.quoteType,
    region: isKorean ? 'KRX' : 'US',
  };
}

const KOREAN_STOCKS = [
  { symbol: '005930.KS', ticker: '005930', name: '삼성전자', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '000660.KS', ticker: '000660', name: 'SK하이닉스', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '005380.KS', ticker: '005380', name: '현대차', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '035420.KS', ticker: '035420', name: 'NAVER', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '035720.KS', ticker: '035720', name: '카카오', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '051910.KS', ticker: '051910', name: 'LG화학', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '006400.KS', ticker: '006400', name: '삼성SDI', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '373220.KS', ticker: '373220', name: 'LG에너지솔루션', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '207940.KS', ticker: '207940', name: '삼성바이오로직스', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '068270.KS', ticker: '068270', name: '셀트리온', market: 'KOSPI', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '247540.KQ', ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
  { symbol: '086520.KQ', ticker: '086520', name: '에코프로', market: 'KOSDAQ', exchange: 'KRX', currency: 'KRW', region: 'KRX' },
];

const US_STOCKS = [
  { symbol: 'AAPL', ticker: 'AAPL', name: 'Apple Inc.', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'MSFT', ticker: 'MSFT', name: 'Microsoft Corporation', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'GOOGL', ticker: 'GOOGL', name: 'Alphabet Inc.', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'AMZN', ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'NVDA', ticker: 'NVDA', name: 'NVIDIA Corporation', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'TSLA', ticker: 'TSLA', name: 'Tesla Inc.', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'META', ticker: 'META', name: 'Meta Platforms Inc.', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
  { symbol: 'SPY', ticker: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ARCA', exchange: 'ARCA', currency: 'USD', region: 'US' },
  { symbol: 'QQQ', ticker: 'QQQ', name: 'Invesco QQQ Trust', market: 'NASDAQ', exchange: 'NASDAQ', currency: 'USD', region: 'US' },
];

const ALL_LOCAL_STOCKS = [...KOREAN_STOCKS, ...US_STOCKS];

function searchLocal(query) {
  const q = query.toLowerCase();
  return ALL_LOCAL_STOCKS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.ticker.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q),
  );
}

async function searchYahoo(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
  const data = await fetchJson(url);
  return (data?.quotes || [])
    .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .map(normalizeResult);
}

export async function searchStocks(query) {
  const local = searchLocal(query);

  try {
    const yahoo = await searchYahoo(query);
    const seen = new Set();
    const merged = [];

    for (const item of [...local, ...yahoo]) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        merged.push(item);
      }
    }

    return merged.slice(0, 20);
  } catch (err) {
    console.warn('Yahoo search failed, using local:', err.message);
    return local.slice(0, 20);
  }
}