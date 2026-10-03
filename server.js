const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { HistoryStore } = require('./lib/history-store');

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const HISTORY_FILE = process.env.HISTORY_FILE || path.join(__dirname, 'data', 'history.json');

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

async function fetchTossPrices(symbols, token = process.env.TOSS_ACCESS_TOKEN) {
  token ||= await getTossAccessToken();
  if (!token) return { mode: 'sample', result: [] };
  const query = encodeURIComponent(symbols.join(','));
  const result = await fetch(`https://openapi.tossinvest.com/api/v1/prices?symbols=${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!result.ok) throw new Error(`Toss API ${result.status}`);
  return { mode: 'live', ...(await result.json()) };
}

let tokenCache = { value: null, expiresAt: 0 };
async function getTossAccessToken() {
  const clientId = process.env.TOSS_CLIENT_ID;
  const clientSecret = process.env.TOSS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;

  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  const response = await fetch('https://openapi.tossinvest.com/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!response.ok) throw new Error(`Toss OAuth ${response.status}`);
  const data = await response.json();
  const value = data.access_token || data.accessToken;
  if (!value) throw new Error('토스증권 액세스 토큰이 응답에 없습니다.');
  const lifetime = Number(data.expires_in || data.expiresIn || 3600);
  tokenCache = { value, expiresAt: Date.now() + Math.max(60, lifetime - 60) * 1000 };
  return value;
}

function createServer(options = {}) {
  const historyStore = options.historyStore || new HistoryStore(HISTORY_FILE);
  return http.createServer((request, response) => {
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

    if (pathname === '/api/toss/prices' && request.method === 'GET') {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      const symbols = (url.searchParams.get('symbols') || '').split(',').filter((symbol) => /^[A-Za-z0-9.-]{1,12}$/.test(symbol)).slice(0, 200);
      if (!symbols.length) {
        sendJson(response, 400, { error: 'symbols가 필요합니다.' });
        return;
      }
      fetchTossPrices(symbols).then((data) => sendJson(response, 200, data)).catch((error) => sendJson(response, 502, { error: error.message }));
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
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`\n  Market Flow가 실행되었습니다.`);
    console.log(`  PC:     http://localhost:${PORT}`);
    console.log(`  모바일: http://<내-PC-IP>:${PORT}\n`);
  });
}

module.exports = { createServer, safeFilePath, fetchTossPrices, getTossAccessToken };
