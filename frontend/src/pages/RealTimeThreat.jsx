import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const RealTimeThreat = () => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [eventsText, setEventsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!lat || !lng) return;
    setLoading(true);
    setAssessment(null);
    try {
      const events = eventsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/ai/real-time-threat', {
        location_coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        current_events: events,
      });
      setAssessment(res.data.assessment);
      toast.success('Threat assessment generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Threat assessment failed');
    }
    setLoading(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); toast.success('Location captured'); },
      (err) => toast.error('Location access denied'),
    );
  };

  const threatColor = (lvl) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[lvl] || '#6b7280';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Real-Time Threat Assessment</h1>
        <p>AI-powered threat analysis for any geographic coordinates</p>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label>Latitude</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className="form-input" required />
          </div>
          <div>
            <label>Longitude</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className="form-input" required />
          </div>
          <button type="button" className="btn btn-secondary" onClick={useCurrentLocation}>📍 Use My Location</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Current Events (one per line, optional)</label>
          <textarea value={eventsText} onChange={(e) => setEventsText(e.target.value)} rows={4} className="form-input" placeholder="e.g., Civil unrest reported in city center&#10;Protest planned for tomorrow" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Assessing...' : '🚨 Get Real-Time Assessment'}
        </button>
      </form>

      {assessment && (
        <div className="card" style={{ padding: 24 }}>
          {assessment.threat_level && (
            <div style={{ padding: 16, background: threatColor(assessment.threat_level), color: '#fff', borderRadius: 8, marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>THREAT LEVEL: {assessment.threat_level.toUpperCase()}</h2>
              <p style={{ margin: 4 }}>Confidence: {assessment.assessment_confidence} · Reassess in: {assessment.reassess_in_minutes} min</p>
            </div>
          )}

          {assessment.immediate_risks?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>⚠️ Immediate Risks</h3>
              <ul>{assessment.immediate_risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          {assessment.immediate_actions?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>✅ Immediate Actions</h3>
              <ol>{assessment.immediate_actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
            </section>
          )}

          {assessment.avoid_areas?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🚫 Areas to Avoid</h3>
              <ul>{assessment.avoid_areas.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </section>
          )}

          {assessment.safe_corridors?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🛣️ Safe Corridors</h3>
              {assessment.safe_corridors.map((c, i) => (
                <div key={i} style={{ padding: 12, background: 'rgba(34,197,94,0.1)', borderRadius: 8, marginBottom: 8 }}>
                  <strong>{c.direction}</strong> — {c.description} ({c.distance_km} km)
                </div>
              ))}
            </section>
          )}

          {assessment.embassy_contacts?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🏛️ Embassy Contacts</h3>
              {assessment.embassy_contacts.map((e, i) => (
                <div key={i} style={{ padding: 12, background: 'rgba(59,130,246,0.1)', borderRadius: 8, marginBottom: 8 }}>
                  <strong>{e.country}</strong>
                  <div>{e.address}</div>
                  <div>📞 {e.phone} · 🚨 Emergency: {e.emergency_phone}</div>
                </div>
              ))}
            </section>
          )}

          {assessment.raw && <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{assessment.raw}</pre>}
        </div>
      )}
    </div>
  );
};

export default RealTimeThreat;
