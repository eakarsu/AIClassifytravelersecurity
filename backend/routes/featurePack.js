// Feature pack router (wave 30A). Mounted at /api/feature-pack by each app's server.
// All routes require the app's existing authentication middleware (injected by the server).
'use strict';
const express = require('express');
const lib = require('../lib/featurePack');

function createFeaturePackRouter({ authenticate, fetchRecords } = {}) {
  const router = express.Router();
  const store = lib.createTaskStore();
  if (authenticate) router.use(authenticate);
  const getRecords = async (req) => {
    if (Array.isArray(req.body && req.body.records)) return req.body.records;
    if (typeof fetchRecords === 'function') { try { return await fetchRecords(req); } catch (_) { return []; } }
    return [];
  };
  async function callProvider(feature, rows) {
    const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const base = process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: 'Return strict JSON: {"sections": {"Summary": "..."}} using only the supplied records. ' + lib.DISCLAIMER },
                   { role: 'user', content: 'Feature: ' + feature + '\nRecords: ' + JSON.stringify(rows).slice(0, 6000) }] }),
    });
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.sections) throw new Error('provider returned no sections');
    return parsed;
  }

  router.get('/tasks', (req, res) => res.json({ data: store.list(req.query) }));
  router.post('/tasks', (req, res) => { try { res.status(201).json({ data: store.create(req.body || {}) }); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });
  router.put('/tasks/:id', (req, res) => { try { const t = store.update(req.params.id, req.body || {}); if (!t) return res.status(404).json({ error: 'task not found' }); res.json({ data: t }); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });
  router.patch('/tasks/:id', (req, res) => { try { const t = store.update(req.params.id, req.body || {}); if (!t) return res.status(404).json({ error: 'task not found' }); res.json({ data: t }); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });

  router.get('/records', async (req, res) => { const rows = lib.filterRecords(await getRecords(req), req.query); res.json({ data: rows, total: rows.length }); });
  router.get('/records/export', async (req, res) => {
    const rows = lib.filterRecords(await getRecords(req), req.query);
    const out = lib.exportRecords(rows, req.query.format);
    res.setHeader('Content-Type', out.contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="records.' + (String(req.query.format || 'json').toLowerCase() === 'csv' ? 'csv' : 'json') + '"');
    res.send(out.body);
  });

  router.get('/ai/features', (req, res) => res.json({ data: Object.keys(lib.AI_FEATURES), disclaimer: lib.DISCLAIMER }));
  router.post('/ai/:feature', async (req, res) => {
    try {
      const rows = await getRecords(req);
      const result = await lib.generateAI(req.params.feature, rows, { callProvider });
      if (String(req.query.format || '').toLowerCase() === 'text') { res.setHeader('Content-Type', 'text/plain'); return res.send(lib.renderAiSections(result)); }
      res.json({ data: result, rendered: lib.renderAiSections(result) });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
  });
  router.store = store;
  return router;
}
module.exports = { createFeaturePackRouter };
