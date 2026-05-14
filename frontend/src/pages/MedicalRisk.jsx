import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const MedicalRisk = () => {
  const [destination, setDestination] = useState('');
  const [tripDuration, setTripDuration] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAssessment(null);
    try {
      const traveler_health_conditions = conditionsText.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/ai/medical-risk', { destination, trip_duration: tripDuration, traveler_health_conditions });
      setAssessment(res.data.medical_assessment);
      toast.success('Medical assessment generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assessment failed');
    }
    setLoading(false);
  };

  const riskColor = (lvl) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[lvl] || '#6b7280';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Medical Risk Assessment</h1>
        <p>AI-driven medical risks, disease info, vaccinations, and emergency contacts for any destination</p>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <label>Destination</label>
        <input value={destination} onChange={(e) => setDestination(e.target.value)} className="form-input" required maxLength={200} placeholder="e.g., Bangkok, Thailand" />

        <label style={{ marginTop: 12 }}>Trip Duration</label>
        <input value={tripDuration} onChange={(e) => setTripDuration(e.target.value)} className="form-input" required maxLength={100} placeholder="e.g., 14 days" />

        <label style={{ marginTop: 12 }}>Pre-existing Health Conditions (comma-separated, optional)</label>
        <input value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} className="form-input" placeholder="e.g., diabetes, hypertension, asthma" />

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Assessing...' : '🩺 Get Medical Assessment'}
        </button>
      </form>

      {assessment && (
        <div className="card" style={{ padding: 24 }}>
          {assessment.overall_medical_risk && (
            <div style={{ padding: 16, background: riskColor(assessment.overall_medical_risk), color: '#fff', borderRadius: 8, marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Overall Medical Risk: {assessment.overall_medical_risk.toUpperCase()}</h2>
            </div>
          )}

          {assessment.medical_facility_quality && (
            <section style={{ marginBottom: 16 }}>
              <h3>🏥 Medical Facility Quality</h3>
              <p>Rating: <strong>{assessment.medical_facility_quality.rating}</strong></p>
              <p>Nearest hospital: {assessment.medical_facility_quality.nearest_international_hospital}</p>
              <p>Trauma care: {assessment.medical_facility_quality.trauma_care_available ? 'Yes' : 'No'}</p>
              {assessment.medical_facility_quality.notes && <p>{assessment.medical_facility_quality.notes}</p>}
            </section>
          )}

          {assessment.disease_risks?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🦠 Disease Risks</h3>
              {assessment.disease_risks.map((d, i) => (
                <div key={i} style={{ padding: 8, borderLeft: `4px solid ${riskColor(d.risk_level)}`, marginBottom: 6 }}>
                  <strong>{d.disease}</strong> — {d.risk_level} {d.seasonal && '(seasonal)'} · {d.notes}
                </div>
              ))}
            </section>
          )}

          {assessment.vaccinations && (
            <section style={{ marginBottom: 16 }}>
              <h3>💉 Vaccinations</h3>
              {assessment.vaccinations.required?.length > 0 && (
                <p><strong>Required:</strong> {assessment.vaccinations.required.join(', ')}</p>
              )}
              {assessment.vaccinations.recommended?.length > 0 && (
                <p><strong>Recommended:</strong> {assessment.vaccinations.recommended.join(', ')}</p>
              )}
              {assessment.vaccinations.timing_advice && <p>{assessment.vaccinations.timing_advice}</p>}
            </section>
          )}

          {assessment.medications_to_bring?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>💊 Medications to Bring</h3>
              <ul>{assessment.medications_to_bring.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </section>
          )}

          {assessment.emergency_medical_contacts?.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3>🚑 Emergency Medical Contacts</h3>
              {assessment.emergency_medical_contacts.map((c, i) => (
                <div key={i} style={{ padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 6 }}>
                  <strong>{c.service}</strong> — 📞 {c.phone} · {c.notes}
                </div>
              ))}
            </section>
          )}

          {assessment.travel_insurance_recommendation && (
            <section>
              <h3>🛡️ Travel Insurance</h3>
              <p>{assessment.travel_insurance_recommendation}</p>
            </section>
          )}

          {assessment.raw && <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>{assessment.raw}</pre>}
        </div>
      )}
    </div>
  );
};

export default MedicalRisk;
