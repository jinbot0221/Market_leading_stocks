const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createServer, safeFilePath, requestTossPrices } = require('../server');
const { HistoryStore } = require('../lib/history-store');

test('serves the dashboard and static assets', async (t) => {
  const server = createServer({ recorder: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /실시간 주도주/);

  const stylesheet = await fetch(`http://127.0.0.1:${port}/styles.css`);
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /text\/css/);
});

test('stores one snapshot per date and exposes history', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'market-flow-'));
  const store = new HistoryStore(path.join(directory, 'history.json'));
  const server = createServer({ historyStore: store, recorder: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { server.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const snapshot = { date: '2026-10-03', sectors: [{ name: '반도체', strength: 94 }] };

  assert.equal((await fetch(`${base}/api/history`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot) })).status, 201);
  snapshot.sectors[0].strength = 96;
  await fetch(`${base}/api/history`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot) });
  const { history } = await (await fetch(`${base}/api/history`)).json();
  assert.equal(history.length, 1);
  assert.equal(history[0].sectors[0].strength, 96);
});

test('rejects paths outside the public directory', () => {
  assert.equal(safeFilePath('/../server.js'), null);
  assert.equal(safeFilePath('/styles.css'), path.join(__dirname, '..', 'public', 'styles.css'));
});

test('preserves the Toss API error reason for connection diagnostics', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ error: { message: '허용되지 않은 IP입니다.' } }), {
    status: 403, headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(
    requestTossPrices(['005930'], 'test-token', fakeFetch),
    (error) => error.status === 403 && error.message === '허용되지 않은 IP입니다.',
  );
});
