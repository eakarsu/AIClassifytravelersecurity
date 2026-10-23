// Feature pack (wave 30A): tasks, record search/filter, export, domain AI with labelled fallback.
// Pure helpers only — no DB, auth, or env side effects on import, so tests can require this directly.
'use strict';

function createTaskStore() {
  const tasks = new Map();
  let nextId = 1;
  return {
    list(filter = {}) {
      let rows = [...tasks.values()];
      if (filter.status) rows = rows.filter((t) => t.status === filter.status);
      if (filter.assignee) rows = rows.filter((t) => t.assignee === filter.assignee);
      if (filter.q) {
        const q = String(filter.q).toLowerCase();
        rows = rows.filter((t) => [t.title, t.description, t.assignee].some((v) => String(v || '').toLowerCase().includes(q)));
      }
      return rows.sort((a, b) => a.id - b.id);
    },
    create(input = {}) {
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      if (!title) { const e = new Error('title is required'); e.status = 400; throw e; }
      const task = {
        id: nextId++,
        title,
        description: input.description || '',
        status: input.status || 'open',
        assignee: input.assignee || '',
        priority: input.priority || 'normal',
        recordRef: input.recordRef || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasks.set(task.id, task);
      return task;
    },
    update(id, input = {}) {
      const task = tasks.get(Number(id));
      if (!task) return null;
      for (const k of ['title', 'description', 'status', 'assignee', 'priority', 'recordRef']) {
        if (input[k] !== undefined) task[k] = input[k];
      }
      if (typeof task.title === 'string') task.title = task.title.trim();
      if (!task.title) { const e = new Error('title is required'); e.status = 400; throw e; }
      task.updatedAt = new Date().toISOString();
      return task;
    },
    get(id) { return tasks.get(Number(id)) || null; },
  };
}

// Generic search/filter over the app's main records. `q`/`search` matches any string/number value;
// every other query key is an exact (case-insensitive) match when the record has that field.
function filterRecords(records, query = {}) {
  const rows = Array.isArray(records) ? records : [];
  const q = String(query.q || query.search || '').trim().toLowerCase();
  const exactKeys = Object.keys(query).filter((k) => !['q', 'search', 'page', 'limit', 'format'].includes(k) && query[k] !== '' && query[k] != null);
  return rows.filter((row) => {
    if (q) {
      const hit = Object.values(row || {}).some((v) => (typeof v === 'string' || typeof v === 'number') && String(v).toLowerCase().includes(q));
      if (!hit) return false;
    }
    for (const k of exactKeys) {
      if (row && row[k] !== undefined && String(row[k]).toLowerCase() !== String(query[k]).toLowerCase()) return false;
    }
    return true;
  });
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(records) {
  const rows = Array.isArray(records) ? records : [];
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))].join('\n');
}

function exportRecords(records, format) {
  const rows = Array.isArray(records) ? records : [];
  if (String(format || 'json').toLowerCase() === 'csv') return { contentType: 'text/csv', body: toCSV(rows) };
  return { contentType: 'application/json', body: JSON.stringify(rows, null, 2) };
}

function hasProviderKey(env = process.env) {
  const bad = (v) => !v || String(v).trim() === '' || String(v).includes('your_') ;
  return !bad(env.OPENROUTER_API_KEY) || !bad(env.OPENAI_API_KEY);
}

// Render AI JSON as readable labelled sections, preserving false / 0 / '' / [] (never dropped).
function renderAiSections(result) {
  const sections = (result && result.sections) || {};
  const lines = [];
  if (result && result.aiGenerated === false) lines.push('Source: deterministic fallback (no AI provider key configured)');
  if (result && result.disclaimer) lines.push('Note: ' + result.disclaimer);
  for (const [label, value] of Object.entries(sections)) {
    let shown;
    if (value === undefined || value === null) shown = '';
    else if (Array.isArray(value)) shown = value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(empty)';
    else if (typeof value === 'object') shown = JSON.stringify(value);
    else shown = String(value); // keeps 'false' and '0'
    lines.push(label + ': ' + shown);
  }
  return lines.join('\n');
}

function countBy(rows, key) {
  const out = {};
  for (const r of rows || []) { const k = r && r[key] != null && r[key] !== '' ? String(r[key]) : '(unset)'; out[k] = (out[k] || 0) + 1; }
  return out;
}


const DISCLAIMER = "Operational travel-security summary over roster records only. Confirm current advisories before travel decisions.";
const AI_FEATURES = {
  'roster-risk-summary': (rows) => ({
    'Total travelers': rows.length,
    'By risk level': countBy(rows, 'risk_level'),
    'By status': countBy(rows, 'status'),
    'By nationality': countBy(rows, 'nationality'),
    'Missing emergency contact': rows.filter((r) => !r.emergency_contact_phone && !r.emergency_contact_name).length,
  }),
  'itinerary-risk-briefing': (rows) => ({
    'Travelers reviewed': rows.length,
    'High or critical risk': rows.filter((r) => ['high', 'critical'].includes(String(r.risk_level || '').toLowerCase())).length,
    'Locations': [...new Set(rows.map((r) => r.current_location).filter(Boolean))],
    'Recommended actions': ['Re-check destination advisory level', 'Confirm emergency contact details', 'Share itinerary with the duty-of-care contact'],
  }),
  'roster-completeness-check': (rows) => ({
    'Total travelers': rows.length,
    'Missing email': rows.filter((r) => !r.email).length,
    'Missing passport number': rows.filter((r) => !r.passport_number).length,
    'Missing location': rows.filter((r) => !r.current_location).length,
    'Complete records': rows.filter((r) => r.email && r.passport_number && r.current_location).length,
  }),
};


async function generateAI(feature, records, opts = {}) {
  const fn = AI_FEATURES[feature];
  if (!fn) { const e = new Error('unknown AI feature: ' + feature); e.status = 404; throw e; }
  const rows = Array.isArray(records) ? records : [];
  if (hasProviderKey(opts.env || process.env) && typeof opts.callProvider === 'function') {
    try {
      const providerResult = await opts.callProvider(feature, rows);
      if (providerResult && providerResult.sections) return { aiGenerated: true, source: 'provider', feature, sections: providerResult.sections, disclaimer: DISCLAIMER };
    } catch (_) { /* fall through to labelled fallback, never fake provider success */ }
  }
  return { aiGenerated: false, source: 'deterministic-fallback', feature, sections: fn(rows), disclaimer: DISCLAIMER };
}

module.exports = { createTaskStore, filterRecords, toCSV, exportRecords, hasProviderKey, renderAiSections, countBy, generateAI, AI_FEATURES, DISCLAIMER };
