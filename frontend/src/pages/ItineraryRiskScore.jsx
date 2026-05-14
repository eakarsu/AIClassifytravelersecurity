import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const ItineraryRiskScore = () => {
  const [tripJson, setTripJson] = useState('{\n  "destination": "Paris, France",\n  "dates": ["2026-06-01", "2026-06-08"],\n  "purpose": "Business"\n}');
  const [threatsText, setThreatsText] = useState('');
  const [advisoriesText, setAdvisoriesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    let trip;
    try {
      trip = JSON.parse(tripJson);
    } catch (_) {
      toast.error('Trip JSON is invalid');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const threats = threatsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const advisories = advisoriesText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/ai/itinerary-risk-score', { trip, threats, advisories });
      setResult(res.data.risk_assessment);
      toast.success('Risk score computed');
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error(err.response?.data?.error || 'AI service unavailable (no API key configured)');
      } else {
        toast.error(err.response?.data?.error || 'Risk score failed');
      }
    }
    setLoading(false);
  };

  const bandColor = (b) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[b] || '#6b7280';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Itinerary Risk Score</h1>
        <p>Composite risk score combining trip, threats, and advisories</p>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div>
          <label>Trip (JSON)</label>
          <textarea value={tripJson} onChange={(e) => setTripJson(e.target.value)} rows={6} className="form-input" style={{ fontFamily: 'monospace' }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Threats (one per line, optional)</label>
          <textarea value={threatsText} onChange={(e) => setThreatsText(e.target.value)} rows={3} className="form-input" placeholder="e.g., Civil unrest near transit hubs" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Advisories (one per line, optional)</label>
          <textarea value={advisoriesText} onChange={(e) => setAdvisoriesText(e.target.value)} rows={3} className="form-input" placeholder="e.g., Level 2 advisory: exercise increased caution" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Scoring...' : '📈 Compute Risk Score'}
        </button>
      </form>

      {result && (
        <div className="card" style={{ padding: 24 }}>
          {result.overall_risk_score !== undefined && (
            <div style={{ padding: 16, background: bandColor(result.risk_band), color: '#fff', borderRadius: 8, marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Score: {result.overall_risk_score} / 100</h2>
              <p style={{ margin: 4 }}>Band: {(result.risk_band || '').toUpperCase()}</p>
            </div>
          )}
          {result.drivers?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>📊 Risk Drivers</h3>
              <ul>{result.drivers.map((d, i) => <li key={i}><strong>{d.factor}</strong> — {d.impact}</li>)}</ul>
            </section>
          )}
          {result.per_leg_scores?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🧭 Per-Leg Scores</h3>
              <ul>{result.per_leg_scores.map((l, i) => <li key={i}>{l.leg}: {l.score}/100</li>)}</ul>
            </section>
          )}
          {result.mitigations?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🛡️ Mitigations</h3>
              <ul>{result.mitigations.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </section>
          )}
          {result.watch_indicators?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>👁️ Watch Indicators</h3>
              <ul>{result.watch_indicators.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </section>
          )}
          {result.raw && <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{result.raw}</pre>}
        </div>
      )}
    </div>
  );
};

export default ItineraryRiskScore;
