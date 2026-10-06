const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../scripts/check-env');

test('accepts configured Toss credentials', () => {
  assert.deepEqual(validateConfig({ TOSS_CLIENT_ID: 'client-123', TOSS_CLIENT_SECRET: 'secret-456' }), {
    valid: true, issues: [],
  });
});

test('rejects missing and example credential values', () => {
  const result = validateConfig({ TOSS_CLIENT_ID: '여기에_Client_ID_입력' });
  assert.equal(result.valid, false);
  assert.equal(result.issues.length, 2);
});
