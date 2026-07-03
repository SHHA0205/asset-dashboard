import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { searchStocks } from './searchService.js';
import { fetchQuotes, getCachedQuotes } from './priceService.js';
import { fetchExchangeRate, getCachedExchangeRate } from './exchangeRateService.js';
import { accessAuth } from './auth.js';
import authRoutes from './authRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

function checkDist() {
  return fs.existsSync(indexPath);
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(accessAuth);

app.get('/api/ping', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    dist: checkDist(),
    uptime: process.uptime(),
  });
});

app.get('/api/health/full', async (_req, res) => {
  try {
    const [quotes, rate] = await Promise.all([
      fetchQuotes(['AAPL', '005930.KS']),
      fetchExchangeRate(),
    ]);
    const live =
      (quotes.quotes.length >= 1 && quotes.quotes.some((q) => q.price > 0)) ||
      (rate.rate ?? 0) > 0;

    res.json({
      status: live ? 'ok' : 'degraded',
      api: live ? 'connected' : 'partial',
      sampleQuotes: quotes.quotes.map((q) => ({ symbol: q.symbol, price: q.price })),
      exchangeRate: rate.rate,
      rateSource: rate.source,
      errors: [quotes.error, rate.error].filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use('/api/auth', authRoutes);

app.get('/api/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
      return res.json({ results: [] });
    }
    const results = await searchStocks(query);
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: '종목 검색에 실패했습니다.', results: [] });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.json({ quotes: getCachedQuotes([]), error: null });
    }
    const { quotes, error } = await fetchQuotes(symbols);
    res.json({ quotes, error });
  } catch (error) {
    console.error('Quote error:', error.message);
    const cached = getCachedQuotes(req.body?.symbols || []);
    res.json({
      quotes: cached,
      error: cached.length > 0 ? '시세 갱신 실패 — 마지막 캐시 데이터를 표시합니다.' : '시세 조회에 실패했습니다.',
    });
  }
});

app.get('/api/exchange-rate', async (_req, res) => {
  try {
    const { rate, fetchedAt, error, source } = await fetchExchangeRate();
    res.json({ pair: 'USD/KRW', rate, fetchedAt, source, error });
  } catch (error) {
    console.error('Exchange rate error:', error.message);
    const cached = getCachedExchangeRate();
    res.json({
      pair: 'USD/KRW',
      rate: cached?.rate ?? null,
      fetchedAt: cached?.fetchedAt ?? null,
      error: cached ? '환율 갱신 실패 — 마지막 캐시 데이터를 표시합니다.' : '환율 조회에 실패했습니다.',
    });
  }
});

app.use(express.static(distPath, { index: 'index.html' }));

app.get('/', (_req, res) => {
  if (checkDist()) {
    res.sendFile(indexPath);
  } else {
    res.status(503).type('text/html').send(
      '<h1>Build required</h1><p>Close server, run start.bat again.</p>',
    );
  }
});

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next();
  }
  if (checkDist()) {
    return res.sendFile(indexPath);
  }
  next();
});

process.on('uncaughtException', (err) => {
  console.error('\n[치명적 오류]', err.message);
  console.error('start-log.txt 또는 이 메시지를 확인하세요.');
});

process.on('unhandledRejection', (err) => {
  console.error('\n[오류]', err?.message || err);
});

const server = app.listen(PORT, HOST, () => {
  const hasDist = checkDist();
  console.log(`서버 실행: http://${HOST}:${PORT}`);
  console.log(`  mode: ${IS_PROD ? 'production' : 'local'}`);
  console.log(`  dist: ${distPath}`);
  if (process.env.ACCESS_PASSWORD) {
    console.log('  auth: password protected');
  }
  if (hasDist) {
    console.log('  web + API OK');
  } else {
    console.log('  [WARN] dist/index.html missing — run npm run build');
  }
  if (!IS_PROD) {
    console.log('  close this window to stop server\n');
  }

  (async () => {
    try {
      const rate = await fetchExchangeRate();
      const quotes = await fetchQuotes(['AAPL', '005930.KS']);
      console.log(`  USD/KRW: ${rate.rate?.toFixed(2)} (${rate.source || 'n/a'})`);
      for (const q of quotes.quotes) {
        console.log(`  ${q.symbol}: ${q.price?.toLocaleString()} ${q.currency}`);
      }
      if (quotes.error || rate.error) {
        console.warn('  Warning:', [quotes.error, rate.error].filter(Boolean).join('; '));
      } else {
        console.log('  External API: connected\n');
      }
    } catch (err) {
      console.error('  Startup API check failed:', err.message);
    }
  })();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[안내] 포트 ${PORT}이(가) 이미 사용 중입니다.`);
    console.error('  서버가 이미 실행 중일 수 있습니다.');
    console.error(`  크롬에서 http://localhost:${PORT} 로 접속해 보세요.`);
    console.error('  재시작이 필요하면 stop.bat 을 실행하세요.\n');
  } else {
    console.error('\n[오류] 서버 시작 실패:', err.message);
  }
});