const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { HistoryStore } = require('./lib/history-store');
const { IntradayStore } = require('./lib/intraday-store');
const { createMarketRecorder, getKstClock } = require('./lib/market-recorder');
const { loadEnv } = require('./lib/load-env');

loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const HISTORY_FILE = process.env.HISTORY_FILE || path.join(__dirname, 'data', 'history.json');
const INTRADAY_FILE = process.env.INTRADAY_FILE || path.join(__dirname, 'data', 'intraday.json');
const TRACKED_SYMBOLS = (process.env.TOSS_SYMBOLS || '000660,042700,267260,196170,247540').split(',');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function safeFilePath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const resolved = path.resolve(PUBLIC_DIR, `.${decodeURIComponent(requested)}`);
  return resolved.startsWith(`${PUBLIC_DIR}${path.sep}`) ? resolved : null;
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) request.destroy(new Error('Payload too large'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

async function requestTossPrices(symbols, token, fetchImpl = fetch) {
  if (!token) return { mode: 'sample', result: [] };
  const query = encodeURIComponent(symbols.join(','));
  const result = await fetchImpl(`https://openapi.tossinvest.com/api/v1/prices?symbols=${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!result.ok) {
    let detail;
    try {
      const payload = await result.json();
      detail = payload.error?.message || payload.message;
    } catch { /* 응답 본문이 JSON이 아닐 수 있습니다. */ }
    const error = new Error(detail || `토스증권 API 응답 오류 (${result.status})`);
    error.status = result.status;
    throw error;
  }
  return { mode: 'live', ...(await result.json()) };
}

async function fetchTossPrices(symbols, providedToken = process.env.TOSS_ACCESS_TOKEN) {
  const token = providedToken || await getTossAccessToken();
  try {
    return await requestTossPrices(symbols, token);
  } catch (error) {
    // 직접 입력한 토큰이 아니라면 만료된 캐시를 비우고 한 번만 자동 재발급합니다.
    if (error.status !== 401 || providedToken) throw error;
    tokenCache = { value: null, expiresAt: 0 };
    return requestTossPrices(symbols, await getTossAccessToken());
  }
}

let tokenCache = { value: null, expiresAt: 0 };
let authFailure = { message: null, retryAt: 0, status: null };
async function getTossAccessToken(fetchImpl = fetch) {
  const clientId = process.env.TOSS_CLIENT_ID?.trim();
  const clientSecret = process.env.TOSS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  if (authFailure.message && Date.now() < authFailure.retryAt) {
    const error = new Error(authFailure.message);
    error.status = authFailure.status;
    error.retryAfter = Math.ceil((authFailure.retryAt - Date.now()) / 1000);
    throw error;
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  const response = await fetchImpl('https://openapi.tossinvest.com/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!response.ok) {
    let apiMessage;
    try {
      const payload = await response.json();
      apiMessage = payload.error?.message || payload.error_description || payload.message;
    } catch { /* 토스 응답이 JSON이 아닌 경우 상태 코드로 안내합니다. */ }
    const message = response.status === 401
      ? 'Client ID 또는 Client Secret이 올바르지 않습니다'
      : apiMessage || `토스 OAuth 인증 오류 (${response.status})`;
    authFailure = { message, status: response.status, retryAt: Date.now() + 30_000 };
    const error = new Error(message);
    error.status = response.status;
    error.retryAfter = 30;
    throw error;
  }
  const data = await response.json();
  const value = data.access_token || data.accessToken || data.result?.access_token || data.result?.accessToken;
  if (!value) throw new Error('토스증권 액세스 토큰이 응답에 없습니다.');
  const lifetime = Number(data.expires_in || data.expiresIn || data.result?.expires_in || data.result?.expiresIn || 3600);
  tokenCache = { value, expiresAt: Date.now() + Math.max(60, lifetime - 60) * 1000 };
  authFailure = { message: null, retryAt: 0, status: null };
  return value;
}

function createServer(options = {}) {
  const historyStore = options.historyStore || new HistoryStore(HISTORY_FILE);
  const intradayStore = options.intradayStore || new IntradayStore(INTRADAY_FILE);
  const recorder = options.recorder === false ? null : (options.recorder || createMarketRecorder({
    store: intradayStore,
    fetchPrices: options.fetchPrices || fetchTossPrices,
    symbols: TRACKED_SYMBOLS,
    intervalMs: Number(process.env.RECORD_INTERVAL_MS) || 60_000,
  }));
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

    if (pathname === '/api/history' && request.method === 'GET') {
      sendJson(response, 200, { history: historyStore.read() });
      return;
    }

    if (pathname === '/api/history' && request.method === 'POST') {
      readBody(request).then((snapshot) => {
        if (!Array.isArray(snapshot.sectors) || snapshot.sectors.length === 0) {
          sendJson(response, 400, { error: 'sectors 배열이 필요합니다.' });
          return;
        }
        sendJson(response, 201, { snapshot: historyStore.save(snapshot) });
      }).catch((error) => sendJson(response, 400, { error: error.message }));
      return;
    }

    if (pathname === '/api/intraday' && request.method === 'GET') {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      const date = url.searchParams.get('date') || getKstClock().date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sendJson(response, 400, { error: 'date는 YYYY-MM-DD 형식이어야 합니다.' });
        return;
      }
      sendJson(response, 200, intradayStore.getDate(date));
      return;
    }

    if (pathname === '/api/recorder/status' && request.method === 'GET') {
      sendJson(response, 200, recorder ? recorder.getStatus() : { state: 'disabled' });
      return;
    }

    if (pathname === '/api/toss/prices' && request.method === 'GET') {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      const symbols = (url.searchParams.get('symbols') || '').split(',').filter((symbol) => /^[A-Za-z0-9.-]{1,12}$/.test(symbol)).slice(0, 200);
      if (!symbols.length) {
        sendJson(response, 400, { error: 'symbols가 필요합니다.' });
        return;
      }
      fetchTossPrices(symbols).then((data) => sendJson(response, 200, data)).catch((error) => sendJson(response, 502, {
        error: error.message, upstreamStatus: error.status || null, retryAfter: error.retryAfter || null,
      }));
      return;
    }

    const filePath = safeFilePath(pathname);

    if (!filePath) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(error.code === 'ENOENT' ? '페이지를 찾을 수 없습니다.' : '서버 오류가 발생했습니다.');
        return;
      }

      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      response.end(content);
    });
  });
  recorder?.start();
  server.on('close', () => recorder?.stop());
  return server;
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`\n  Market Flow가 실행되었습니다.`);
    console.log(`  PC:     http://localhost:${PORT}`);
    console.log(`  모바일: http://<내-PC-IP>:${PORT}\n`);
  });
}

function resetTossAuthForTests() {
  tokenCache = { value: null, expiresAt: 0 };
  authFailure = { message: null, retryAt: 0, status: null };
}

module.exports = { createServer, safeFilePath, fetchTossPrices, getTossAccessToken, requestTossPrices, resetTossAuthForTests };
