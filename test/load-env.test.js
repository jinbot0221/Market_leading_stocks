const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnv } = require('../lib/load-env');

test('loads values from an env file without replacing existing variables', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'market-flow-env-'));
  const file = path.join(directory, '.env');
  fs.writeFileSync(file, '# comment\nTOSS_CLIENT_ID="my-id"\nTOSS_CLIENT_SECRET=my-secret\nPORT=9999\n');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = { PORT: '4173' };

  assert.equal(loadEnv(file, target), true);
  assert.equal(target.TOSS_CLIENT_ID, 'my-id');
  assert.equal(target.TOSS_CLIENT_SECRET, 'my-secret');
  assert.equal(target.PORT, '4173');
});

test('silently skips a missing env file', () => {
  assert.equal(loadEnv('/missing/market-flow/.env', {}), false);
});
