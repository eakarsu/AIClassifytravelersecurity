import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const EvacuationPlanner = () => {
  const [location, setLocation] = useState('');
  const [threatLevel, setThreatLevel] = useState('high');
  const [exitsText, setExitsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPlan(null);
    try {
      const exit_options = exitsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/ai/evacuation-planner', {
        traveler_location: location,
        threat_level: threatLevel,
        exit_options,
      });
      setPlan(res.data.evacuation_plan);
      toast.success('Evacuation plan generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Plan generation failed');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Evacuation Planner</h1>
        <p>AI-generated prioritized evacuation routes with timing, items, and abort conditions</p>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <label>Current Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" required maxLength={500} placeholder="e.g., Hotel Hilton, Cairo, Egypt" />

        <label style={{ marginTop: 12 }}>Threat Level</label>
        <select value={threatLevel} onChange={(e) => setThreatLevel(e.target.value)} className="form-input">
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <label style={{ marginTop: 12 }}>Available Exit Options (one per line, optional)</label>
        <textarea value={exitsText} onChange={(e) => setExitsText(e.target.value)} rows={4} className="form-input" placeholder="e.g., Cairo International Airport (CAI)&#10;Egyptian Border Crossing - Taba" />

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Planning...' : '🗺️ Generate Plan'}
        </button>
      </form>

      {plan && (
        <div className="card" style={{ padding: 24 }}>
          {plan.priority_route && (
            <section style={{ marginBottom: 24 }}>
              <h3>⭐ Priority Route</h3>
              <div style={{ padding: 16, background: 'rgba(34,197,94,0.1)', borderRadius: 8 }}>
                <p>{plan.priority_route.description}</p>
                <p><strong>Time:</strong> {plan.priority_route.estimated_time_hours}h · <strong>Risk:</strong> {plan.priority_route.risk_level}</p>
                {plan.priority_route.steps?.length > 0 && (
                  <ol>{plan.priority_route.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                )}
              </div>
            </section>
          )}

          {plan.alternative_routes?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3>🔀 Alternative Routes</h3>
              {plan.alternative_routes.map((r, i) => (
                <div key={i} style={{ padding: 12, background: 'rgba(59,130,246,0.05)', borderRadius: 8, marginBottom: 8 }}>
                  <h4>{r.description}</h4>
                  <p>Time: {r.estimated_time_hours}h · Risk: {r.risk_level}</p>
                  {r.steps?.length > 0 && <ol>{r.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>}
                </div>
              ))}
            </section>
          )}

          {plan.checkpoints?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h3>🛑 Checkpoints</h3>
              {plan.checkpoints.map((c, i) => (
                <div key={i} style={{ padding: 12, background: 'rgba(234,179,8,0.1)', borderRadius: 8, marginBottom: 8 }}>
                  <strong>{c.location}</strong> — {c.action} · Contact: {c.contact}
                </div>
              ))}
            </section>
          )}

          {plan.timing_advice && (
            <section style={{ marginBottom: 16 }}>
              <h3>⏱️ Timing Advice</h3>
              <p>{plan.timing_advice}</p>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {plan.items_to_bring?.length > 0 && (
              <section>
                <h3>✅ Items to Bring</h3>
                <ul>{plan.items_to_bring.map((i, k) => <li key={k}>{i}</li>)}</ul>
              </section>
            )}
            {plan.items_to_leave?.length > 0 && (
              <section>
                <h3>❌ Items to Leave</h3>
                <ul>{plan.items_to_leave.map((i, k) => <li key={k}>{i}</li>)}</ul>
              </section>
            )}
          </div>

          {plan.communications && (
            <section style={{ marginTop: 16 }}>
              <h3>📞 Communications</h3>
              <ul>
                <li>Notify contacts: {plan.communications.notify_contacts ? 'Yes' : 'No'}</li>
                <li>Check-in frequency: every {plan.communications.check_in_frequency_hours}h</li>
                <li>Embassy notification: {plan.communications.embassy_notification ? 'Yes' : 'No'}</li>
              </ul>
            </section>
          )}

          {plan.abort_conditions?.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <h3>🚨 Abort Conditions</h3>
              <ul style={{ color: '#ef4444' }}>{plan.abort_conditions.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </section>
          )}

          {plan.raw && <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>{plan.raw}</pre>}
        </div>
      )}
    </div>
  );
};

export default EvacuationPlanner;
