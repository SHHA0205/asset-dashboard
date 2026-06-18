import https from 'https';
import http from 'http';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TLS_OPTIONS = { rejectUnauthorized: false };

let yahooCookies = '';
let yahooCrumb = '';
let crumbFetchedAt = 0;
const CRUMB_TTL_MS = 30 * 60 * 1000;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': UA,
        Accept: 'application/json,text/plain,*/*',
        ...options.headers,
      },
      ...(isHttps ? TLS_OPTIONS : {}),
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          body,
          json() {
            return JSON.parse(body);
          },
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy(new Error(`Request timeout: ${url}`));
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function fetchJson(url, options = {}) {
  const res = await request(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  try {
    return res.json();
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${res.body.slice(0, 120)}`);
  }
}

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return list.map((c) => c.split(';')[0]).join('; ');
}

export async function getYahooAuth() {
  const now = Date.now();
  if (yahooCrumb && yahooCookies && now - crumbFetchedAt < CRUMB_TTL_MS) {
    return { crumb: yahooCrumb, cookies: yahooCookies };
  }

  const fcRes = await request('https://fc.yahoo.com', { method: 'GET' });
  yahooCookies = parseCookies(fcRes.headers['set-cookie']);

  const crumbRes = await request('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { Cookie: yahooCookies },
  });

  if (crumbRes.status !== 200) {
    throw new Error(`Yahoo crumb fetch failed: ${crumbRes.status}`);
  }

  yahooCrumb = crumbRes.body.trim();
  crumbFetchedAt = now;

  return { crumb: yahooCrumb, cookies: yahooCookies };
}

export async function yahooFetchJson(url) {
  const { crumb, cookies } = await getYahooAuth();
  const separator = url.includes('?') ? '&' : '?';
  const authedUrl = `${url}${separator}crumb=${encodeURIComponent(crumb)}`;
  return fetchJson(authedUrl, { headers: { Cookie: cookies } });
}