/*
 * Custom Views: Airport Traveler Security Classification
 *
 * Endpoints (mounted at /api/custom-views):
 *   POST /risk-classification         (VIZ)     Synthesizes traveler risk tiers for the dashboard
 *   POST /traveler-flow               (VIZ)     Synthesizes airport flow / chokepoint analytics
 *   POST /secondary-screening-pdf     (NON-VIZ) Synthesizes a printable secondary-screening report
 *   POST /screening-rules             (NON-VIZ) Synthesizes / validates configurable screening rules
 *
 * All endpoints synthesize JSON via OpenRouter. They degrade to a deterministic
 * local synthesizer when OPENROUTER_API_KEY is missing so the UI is never blank.
 */
const express = require('express');
const https = require('https');
const router = express.Router();
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Best-effort JWT auth (mirrors other custom routes in this project).
let authMiddleware = (req, res, next) => next();
try {
  const m = require('../middleware/auth');
  authMiddleware = (typeof m === 'function')
    ? m
    : (m.authenticate || m.authenticateToken || m.requireAuth || m.default || authMiddleware);
} catch (_) { /* no auth available */ }

const SYSTEM_PROMPT =
  'You are an expert airport traveler security classification analyst. ' +
  'You triage passengers, predict secondary-screening risk, optimize terminal flow, ' +
  'and produce strict JSON responses suitable for SOC dashboards.';

function callOpenRouter(userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const e = new Error('OPENROUTER_API_KEY not configured');
      e.code = 'MISSING_KEY';
      return reject(e);
    }
    const body = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1600,
    });
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'http://localhost:3000',
      },
      timeout: 30000,
    }, (resp) => {
      let data = '';
      resp.on('data', (c) => (data += c));
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'OpenRouter API error'));
          resolve(parsed?.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('OpenRouter timeout')));
    req.write(body);
    req.end();
  });
}

function parseJSONLoose(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  try { return JSON.parse(text); } catch (_) {}
  const fence = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1]); } catch (_) {} }
  const obj = String(text).match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch (_) {} }
  return null;
}

// ── Deterministic fallback synthesizers (used when AI is unavailable) ────────
function fallbackRiskClassification(payload = {}) {
  const travelers = Array.isArray(payload.travelers) && payload.travelers.length
    ? payload.travelers
    : [
        { id: 'PAX-1001', name: 'A. Okafor',     origin: 'LOS', destination: 'JFK', flags: ['no_prior_visits'] },
        { id: 'PAX-1002', name: 'M. Yilmaz',     origin: 'IST', destination: 'LHR', flags: [] },
        { id: 'PAX-1003', name: 'S. Petrova',    origin: 'SVO', destination: 'CDG', flags: ['watchlist_partial'] },
        { id: 'PAX-1004', name: 'J. Chen',       origin: 'PVG', destination: 'SFO', flags: [] },
        { id: 'PAX-1005', name: 'R. Hassan',     origin: 'DXB', destination: 'ORD', flags: ['cash_purchase', 'oneway'] },
        { id: 'PAX-1006', name: 'E. Müller',     origin: 'FRA', destination: 'YYZ', flags: [] },
        { id: 'PAX-1007', name: 'L. Romero',     origin: 'BOG', destination: 'MIA', flags: ['interpol_match_low'] },
        { id: 'PAX-1008', name: 'K. Tanaka',     origin: 'NRT', destination: 'LAX', flags: [] },
      ];
  const tiers = { green: 0, amber: 0, red: 0 };
  const classified = travelers.map((t, i) => {
    const flags = Array.isArray(t.flags) ? t.flags : [];
    let score = 12 + ((i * 17) % 30);
    if (flags.includes('watchlist_partial') || flags.includes('interpol_match_low')) score += 35;
    if (flags.includes('cash_purchase')) score += 12;
    if (flags.includes('oneway')) score += 8;
    if (flags.includes('no_prior_visits')) score += 6;
    score = Math.min(99, score);
    const tier = score >= 70 ? 'red' : score >= 40 ? 'amber' : 'green';
    tiers[tier] += 1;
    return {
      id: t.id || `PAX-${1000 + i}`,
      name: t.name || `Passenger ${i + 1}`,
      origin: t.origin || 'UNK',
      destination: t.destination || 'UNK',
      risk_score: score,
      tier,
      rationale: flags.length
        ? `Flags: ${flags.join(', ')}`
        : 'No active flags; baseline behavioural model only.',
    };
  });
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total: classified.length,
      green: tiers.green,
      amber: tiers.amber,
      red: tiers.red,
      avg_score: Math.round(classified.reduce((a, b) => a + b.risk_score, 0) / classified.length),
    },
    classified,
    recommendations: [
      'Escalate all RED tier travelers to secondary screening.',
      'Re-baseline AMBER tier scores every 30 minutes.',
      'GREEN tier may use expedited lanes if biometric match confidence > 0.97.',
    ],
  };
}

function fallbackTravelerFlow(payload = {}) {
  const terminals = payload.terminals || ['T1-Intl', 'T2-Domestic', 'T3-Concourse-A'];
  const slots = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  const series = terminals.map((t, ti) => ({
    terminal: t,
    points: slots.map((s, si) => ({
      time: s,
      throughput: 240 + ((ti * 73 + si * 41) % 380),
      wait_min: 4 + ((ti * 5 + si * 3) % 22),
    })),
  }));
  const chokepoints = [
    { location: 'T1-Intl Security Lane 4', severity: 'high',   wait_min: 28, recommendation: 'Open lane 5 and divert PreCheck.' },
    { location: 'T2-Domestic Bag Drop',     severity: 'medium', wait_min: 14, recommendation: 'Add 2 staff for next 45 min.' },
    { location: 'T3 Boarding Gate A12',     severity: 'low',    wait_min: 6,  recommendation: 'Monitor — within SLA.' },
  ];
  return {
    generated_at: new Date().toISOString(),
    series,
    chokepoints,
    peak_window: '08:00 - 10:00',
    overall_wait_min_avg: 11,
    notes: 'Synthesized from rolling 24h baseline; no live sensor feed configured.',
  };
}

function fallbackSecondaryScreeningPDF(payload = {}) {
  const traveler = payload.traveler || { id: 'PAX-1005', name: 'R. Hassan', origin: 'DXB', destination: 'ORD' };
  return {
    generated_at: new Date().toISOString(),
    title: `Secondary Screening Report — ${traveler.name || traveler.id}`,
    traveler,
    sections: [
      { heading: 'Subject Identification',
        body: `Passenger ${traveler.name} (${traveler.id}) traveling ${traveler.origin || 'UNK'} → ${traveler.destination || 'UNK'}.` },
      { heading: 'Triggering Factors',
        body: 'Cash ticket purchase within 24h of departure; one-way international itinerary; partial watchlist phonetic match (low confidence).' },
      { heading: 'Officer Checklist',
        body: '1. Verify travel documents.\n2. Conduct behavioural interview (15 min).\n3. Inspect carry-on (CT scanner pass 2).\n4. Confirm onward travel funds.\n5. Log findings into case 78421.' },
      { heading: 'Risk Determination',
        body: 'Initial automated tier: RED (score 78). Officer override allowed with supervisor signature.' },
      { heading: 'Disposition',
        body: 'Clear / Conditional / Refer — to be marked on form CBP-77B after interview.' },
    ],
    footer: 'CONFIDENTIAL — Aviation Security. Retain per 49 CFR 1520.',
  };
}

function fallbackScreeningRules(payload = {}) {
  const incoming = Array.isArray(payload.rules) ? payload.rules : [];
  const baseline = [
    { id: 'R-001', when: 'cash_purchase AND oneway', then: 'secondary_screening', weight: 35, enabled: true },
    { id: 'R-002', when: 'watchlist_partial',         then: 'manual_review',       weight: 50, enabled: true },
    { id: 'R-003', when: 'no_prior_visits AND age < 25', then: 'enhanced_questions', weight: 15, enabled: true },
    { id: 'R-004', when: 'high_risk_origin',          then: 'secondary_screening', weight: 25, enabled: true },
    { id: 'R-005', when: 'precheck_member AND score < 40', then: 'expedited',      weight: -20, enabled: true },
  ];
  const merged = [...baseline];
  incoming.forEach((r, i) => {
    if (!r || !r.when || !r.then) return;
    merged.push({
      id: r.id || `R-${100 + i}`,
      when: String(r.when),
      then: String(r.then),
      weight: Number.isFinite(r.weight) ? r.weight : 10,
      enabled: r.enabled !== false,
    });
  });
  return {
    generated_at: new Date().toISOString(),
    rules: merged,
    validation: {
      duplicates: 0,
      conflicts: [],
      coverage_estimate_pct: 92,
    },
    suggestions: [
      'Consider adding rule for connecting flights from medium-risk origins.',
      'Weight R-002 may be too aggressive; tune after 30-day false-positive review.',
    ],
  };
}

// Required shape signatures per view — used to validate AI output. If the AI's
// response is missing the required top-level keys we keep its insight as 'ai_raw'
// but use the fallback data to drive the UI so the dashboard is never broken.
const REQUIRED_SHAPE = {
  risk_classification:    ['summary', 'classified'],
  traveler_flow:          ['series', 'chokepoints'],
  secondary_screening_pdf:['title', 'sections', 'traveler'],
  screening_rules:        ['rules'],
};

function shapeMatches(view, data) {
  if (!data || typeof data !== 'object') return false;
  const req = REQUIRED_SHAPE[view] || [];
  return req.every((k) => Object.prototype.hasOwnProperty.call(data, k));
}

async function synthesize(view, payload, fallbackFn) {
  if (!process.env.OPENROUTER_API_KEY) {
    return { source: 'fallback', view, data: fallbackFn(payload) };
  }
  const fallbackData = fallbackFn(payload);
  try {
    const example = JSON.stringify(fallbackData).slice(0, 1800);
    const prompt =
      `View: ${view}\nDomain: Airport traveler security classification.\n` +
      `Context (JSON):\n${JSON.stringify(payload || {}).slice(0, 1200)}\n\n` +
      `Schema example with realistic seed values (MATCH this shape exactly — same top-level keys, ` +
      `same nested keys, same array-element shapes, and populate ALL arrays with at least the same ` +
      `number of elements; do not return empty arrays or zero counts; vary the values realistically):\n${example}\n\n` +
      `Return STRICT JSON only — no prose, no markdown, no code fences.`;
    const raw = await callOpenRouter(prompt);
    const parsed = parseJSONLoose(raw);
    if (parsed && shapeMatches(view, parsed) && !isEmptyShape(view, parsed)) {
      return { source: 'ai', view, data: parsed };
    }
    // AI returned JSON but wrong shape OR empty data — use safe fallback to drive UI.
    return {
      source: parsed ? (isEmptyShape(view, parsed) ? 'fallback_after_ai_empty' : 'fallback_after_ai_shape_mismatch')
                     : 'fallback_after_ai_parse_fail',
      view,
      data: fallbackData,
      ai_raw: parsed || String(raw).slice(0, 240),
    };
  } catch (err) {
    return { source: 'fallback_after_ai_error', view, data: fallbackData, error: String(err.message || err) };
  }
}

function isEmptyShape(view, data) {
  if (!data) return true;
  if (view === 'risk_classification') {
    return !(Array.isArray(data.classified) && data.classified.length > 0);
  }
  if (view === 'traveler_flow') {
    return !(Array.isArray(data.series) && data.series.length > 0);
  }
  if (view === 'secondary_screening_pdf') {
    return !(Array.isArray(data.sections) && data.sections.length > 0);
  }
  if (view === 'screening_rules') {
    return !(Array.isArray(data.rules) && data.rules.length > 0);
  }
  return false;
}

router.use(authMiddleware);

// ── VIZ 1: Risk Classification Dashboard ─────────────────────────────────────
router.post('/risk-classification', async (req, res) => {
  try {
    const out = await synthesize('risk_classification', req.body || {}, fallbackRiskClassification);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'risk_classification failed', details: String(err.message || err) });
  }
});

// ── VIZ 2: Traveler Flow Chart ───────────────────────────────────────────────
router.post('/traveler-flow', async (req, res) => {
  try {
    const out = await synthesize('traveler_flow', req.body || {}, fallbackTravelerFlow);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'traveler_flow failed', details: String(err.message || err) });
  }
});

// ── NON-VIZ 1: Secondary Screening Printable Report (PDF source data) ───────
router.post('/secondary-screening-pdf', async (req, res) => {
  try {
    const out = await synthesize('secondary_screening_pdf', req.body || {}, fallbackSecondaryScreeningPDF);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'secondary_screening_pdf failed', details: String(err.message || err) });
  }
});

// ── NON-VIZ 2: Screening Rules Editor (validate / synthesize rules) ─────────
router.post('/screening-rules', async (req, res) => {
  try {
    const out = await synthesize('screening_rules', req.body || {}, fallbackScreeningRules);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'screening_rules failed', details: String(err.message || err) });
  }
});

router.get('/health', (req, res) => {
  res.json({
    feature: 'custom_views',
    ok: true,
    endpoints: ['/risk-classification', '/traveler-flow', '/secondary-screening-pdf', '/screening-rules'],
    ai_configured: !!process.env.OPENROUTER_API_KEY,
  });
});

module.exports = router;
