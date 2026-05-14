import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const CyberSecurity = () => {
  const [destination, setDestination] = useState('');
  const [travelerRole, setTravelerRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAssessment(null);
    try {
      const res = await api.post('/ai/cyber-security', { destination, traveler_role: travelerRole });
      setAssessment(res.data.cyber_security_assessment);
      toast.success('Cyber security assessment generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assessment failed');
    }
    setLoading(false);
  };

  const riskColor = (lvl) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[lvl] || '#6b7280';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cyber Security Briefing</h1>
        <p>Digital security recommendations for travelers based on destination and role</p>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <label>Destination</label>
        <input value={destination} onChange={(e) => setDestination(e.target.value)} className="form-input" required maxLength={200} placeholder="e.g., Beijing, China" />

        <label style={{ marginTop: 12 }}>Traveler Role / Profession</label>
        <input value={travelerRole} onChange={(e) => setTravelerRole(e.target.value)} className="form-input" required maxLength={200} placeholder="e.g., Government contractor, Tech executive, Journalist" />

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Analyzing...' : '🔐 Get Cyber Briefing'}
        </button>
      </form>

      {assessment && (
        <div className="card" style={{ padding: 24 }}>
          {assessment.overall_cyber_risk && (
            <div style={{ padding: 16, background: riskColor(assessment.overall_cyber_risk), color: '#fff', borderRadius: 8, marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Cyber Risk: {assessment.overall_cyber_risk.toUpperCase()}</h2>
            </div>
          )}

          {assessment.vpn_recommendation && (
            <section style={{ marginBottom: 16 }}>
              <h3>🌐 VPN</h3>
              <p>Required: <strong>{assessment.vpn_recommendation.required ? 'YES' : 'NO'}</strong></p>
              <p>{assessment.vpn_recommendation.reason}</p>
              {assessment.vpn_recommendation.recommended_providers?.length > 0 && (
                <p>Providers: {assessment.vpn_recommendation.recommended_providers.join(', ')}</p>
              )}
            </section>
          )}

          {assessment.device_hardening?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🛡️ Device Hardening</h3>
              {assessment.device_hardening.map((h, i) => (
                <div key={i} style={{ padding: 8, borderLeft: `4px solid ${riskColor(h.priority)}`, marginBottom: 6 }}>
                  <strong>{h.action}</strong> ({h.priority})<br />
                  <small>{h.instructions}</small>
                </div>
              ))}
            </section>
          )}

          {assessment.data_sensitivity_rules?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🔒 Data Sensitivity Rules</h3>
              {assessment.data_sensitivity_rules.map((r, i) => (
                <div key={i} style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 6, marginBottom: 6 }}>
                  <strong>{r.data_type}:</strong> {r.rule}<br />
                  <small>{r.reason}</small>
                </div>
              ))}
            </section>
          )}

          {assessment.network_safety?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>📡 Network Safety</h3>
              {assessment.network_safety.map((n, i) => (
                <div key={i} style={{ padding: 8, marginBottom: 6 }}>
                  <strong>{n.scenario}:</strong> {n.recommendation}
                </div>
              ))}
            </section>
          )}

          {assessment.communications_security && (
            <section style={{ marginBottom: 16 }}>
              <h3>📱 Communications Security</h3>
              {assessment.communications_security.encrypted_apps?.length > 0 && (
                <p><strong>Encrypted apps:</strong> {assessment.communications_security.encrypted_apps.join(', ')}</p>
              )}
              {assessment.communications_security.avoid_apps?.length > 0 && (
                <p><strong>Avoid:</strong> {assessment.communications_security.avoid_apps.join(', ')}</p>
              )}
              {assessment.communications_security.email_guidance && <p>{assessment.communications_security.email_guidance}</p>}
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {assessment.before_travel_checklist?.length > 0 && (
              <section>
                <h3>✈️ Before Travel</h3>
                <ul>{assessment.before_travel_checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </section>
            )}
            {assessment.after_travel_checklist?.length > 0 && (
              <section>
                <h3>🏠 After Travel</h3>
                <ul>{assessment.after_travel_checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </section>
            )}
          </div>

          {assessment.role_specific_warnings?.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <h3>⚠️ Role-Specific Warnings</h3>
              <ul style={{ color: '#ef4444' }}>{assessment.role_specific_warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </section>
          )}

          {assessment.raw && <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>{assessment.raw}</pre>}
        </div>
      )}
    </div>
  );
};

export default CyberSecurity;
