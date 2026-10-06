const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('provides ten unique candidates for every sector', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('public/sector-data.js', 'utf8'), context);
  const sectors = Object.values(context.window.SECTOR_STOCKS);

  assert.equal(sectors.length, 30);
  sectors.forEach((stocks) => {
    assert.equal(stocks.length, 10);
    assert.equal(new Set(stocks.map(([symbol]) => symbol)).size, 10);
  });
});
