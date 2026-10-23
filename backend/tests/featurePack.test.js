const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib/featurePack');

test('tasks create/list/update with validation', () => {
  const s = lib.createTaskStore();
  const t = s.create({ title: 'Follow up', status: 'open' });
  assert.equal(t.id, 1);
  assert.equal(s.list({ status: 'open' }).length, 1);
  assert.equal(s.update(t.id, { status: 'done' }).status, 'done');
  assert.equal(s.update(999, { status: 'done' }), null);
  assert.throws(() => s.create({ title: '  ' }), /title is required/);
});

test('filterRecords supports q search and exact filters', () => {
  const rows = [{ name: 'Passport help', status: 'active', fee: 0 }, { name: 'Permit', status: 'inactive', fee: 5 }];
  assert.equal(lib.filterRecords(rows, { q: 'passport' }).length, 1);
  assert.equal(lib.filterRecords(rows, { status: 'ACTIVE' }).length, 1);
  assert.equal(lib.filterRecords(rows, { q: 'permit', status: 'active' }).length, 0);
});

test('export produces CSV and JSON preserving zero values', () => {
  const rows = [{ name: 'A', fee: 0, active: false }];
  assert.match(lib.exportRecords(rows, 'csv').body, /A,0,false/);
  assert.equal(JSON.parse(lib.exportRecords(rows, 'json').body)[0].fee, 0);
  assert.equal(lib.exportRecords([], 'csv').body, '');
});

test('AI fallback is labelled aiGenerated:false and render preserves false/0/empty', async () => {
  const saved = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
  try {
    const feature = Object.keys(lib.AI_FEATURES)[0];
    const r = await lib.generateAI(feature, [{ status: 'active', fee: 0, description: '' }]);
    assert.equal(r.aiGenerated, false);
    assert.equal(r.source, 'deterministic-fallback');
    const text = lib.renderAiSections({ aiGenerated: false, sections: { Enabled: false, Count: 0, Note: '' } });
    assert.match(text, /Enabled: false/);
    assert.match(text, /Count: 0/);
    assert.match(text, /Note: /);
  } finally {
    if (saved.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = saved.OPENROUTER_API_KEY;
    if (saved.OPENAI_API_KEY) process.env.OPENAI_API_KEY = saved.OPENAI_API_KEY;
  }
});

test('AI uses provider only when a key is configured', async () => {
  const feature = Object.keys(lib.AI_FEATURES)[0];
  const r = await lib.generateAI(feature, [], { env: { OPENROUTER_API_KEY: 'test-key' }, callProvider: async () => ({ sections: { Summary: 'ok' } }) });
  assert.equal(r.aiGenerated, true);
});
