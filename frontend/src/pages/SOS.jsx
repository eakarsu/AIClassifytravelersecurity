import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const SOS = () => {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrigger, setShowTrigger] = useState(false);
  const [form, setForm] = useState({ traveler_id: '', lat: '', lng: '', situation_description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sos/active');
      setActiveAlerts(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load SOS alerts');
    }
    setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const trigger = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/sos/trigger', {
        traveler_id: parseInt(form.traveler_id),
        location: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
        situation_description: form.situation_description,
      });
      toast.success(`SOS triggered (Case #${res.data.sos_id})`);
      setShowTrigger(false);
      setForm({ traveler_id: '', lat: '', lng: '', situation_description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Trigger failed');
    }
  };

  const resolve = async (id) => {
    if (!window.confirm('Mark this SOS as resolved?')) return;
    try {
      await api.patch(`/sos/${id}/resolve`);
      toast.success('SOS resolved');
      load();
    } catch (err) {
      toast.error('Resolve failed');
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => toast.error('Location access denied'),
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🚨 SOS Emergency Center</h1>
        <p>Active emergency alerts; auto-refreshes every 30s</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }} onClick={() => setShowTrigger(true)}>
          🚨 TRIGGER SOS
        </button>
        <button className="btn btn-secondary" onClick={load}>🔄 Refresh</button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center' }}>{activeAlerts.length} active alert{activeAlerts.length !== 1 && 's'}</span>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && activeAlerts.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: '#22c55e' }}>✓ No active SOS alerts</p>
        </div>
      )}

      {!loading && activeAlerts.map((alert) => {
        const loc = typeof alert.location === 'string' ? JSON.parse(alert.location) : alert.location;
        const notified = typeof alert.notified_contacts === 'string' ? JSON.parse(alert.notified_contacts) : alert.notified_contacts;
        return (
          <div key={alert.id} className="card" style={{ padding: 24, marginBottom: 16, border: '2px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, color: '#ef4444' }}>🚨 SOS Case #{alert.id}</h2>
                <p style={{ margin: '4px 0', fontSize: 14 }}>
                  Traveler: <strong>{alert.first_name} {alert.last_name}</strong> (#{alert.traveler_id})
                  {alert.traveler_email && <> · {alert.traveler_email}</>}
                  {alert.traveler_phone && <> · 📞 {alert.traveler_phone}</>}
                </p>
                <p style={{ margin: '4px 0', fontSize: 14 }}>
                  📍 Location: Lat {loc?.lat || loc?.latitude}, Lng {loc?.lng || loc?.longitude}
                </p>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#9ca3af' }}>
                  Created: {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => resolve(alert.id)}>✓ Resolve</button>
            </div>
            {alert.situation_description && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                <strong>Situation:</strong> {alert.situation_description}
              </div>
            )}
            {notified?.length > 0 && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#22c55e' }}>
                ✓ Notified: {notified.join(', ')}
              </p>
            )}
            {alert.notification_error && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>
                ⚠ {alert.notification_error}
              </p>
            )}
          </div>
        );
      })}

      {showTrigger && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={trigger} className="card" style={{ padding: 24, width: 500 }}>
            <h2 style={{ color: '#ef4444', marginTop: 0 }}>🚨 Trigger SOS Alert</h2>

            <label>Traveler ID</label>
            <input type="number" value={form.traveler_id} onChange={(e) => setForm({ ...form, traveler_id: e.target.value })} className="form-input" required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 12, alignItems: 'end' }}>
              <div>
                <label>Latitude</label>
                <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="form-input" required />
              </div>
              <div>
                <label>Longitude</label>
                <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="form-input" required />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentLocation}>📍</button>
            </div>

            <label style={{ marginTop: 12 }}>Situation Description (optional)</label>
            <textarea value={form.situation_description} onChange={(e) => setForm({ ...form, situation_description: e.target.value })} className="form-input" rows={4} maxLength={2000} />

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowTrigger(false)}>Cancel</button>
              <button type="submit" className="btn btn-danger" style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}>🚨 TRIGGER SOS</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SOS;
