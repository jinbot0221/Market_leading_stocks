const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { IntradayStore } = require('../lib/intraday-store');
const { createMarketRecorder, getKstClock, isRecordingHours } = require('../lib/market-recorder');

test('uses Korea time and records from 08:00 through the 20:00 minute', () => {
  assert.deepEqual(getKstClock(new Date('2026-10-04T23:00:00Z')), { date: '2026-10-05', time: '08:00', hour: 8, minute: 0 });
  assert.equal(isRecordingHours(new Date('2026-10-04T22:59:00Z')), false);
  assert.equal(isRecordingHours(new Date('2026-10-04T23:00:00Z')), true);
  assert.equal(isRecordingHours(new Date('2026-10-05T10:59:00Z')), true);
  assert.equal(isRecordingHours(new Date('2026-10-05T11:00:00Z')), true);
  assert.equal(isRecordingHours(new Date('2026-10-05T11:01:00Z')), false);
});

test('upserts one intraday price snapshot per minute', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'market-intraday-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new IntradayStore(path.join(directory, 'intraday.json'));
  let price = '100';
  const recorder = createMarketRecorder({
    store, symbols: ['005930'],
    fetchPrices: async () => ({ mode: 'live', result: [{ symbol: '005930', lastPrice: price }] }),
  });
  const now = new Date('2026-10-05T00:30:00Z');

  await recorder.tick(now);
  price = '101';
  await recorder.tick(now);

  const day = store.getDate('2026-10-05');
  assert.equal(day.snapshots.length, 1);
  assert.equal(day.snapshots[0].time, '09:30');
  assert.equal(day.snapshots[0].prices[0].lastPrice, '101');
  assert.equal(recorder.getStatus().state, 'recording');
});
