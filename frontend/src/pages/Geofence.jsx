import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Geofence = () => {
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('zones');
  const [showCreate, setShowCreate] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    risk_level: 'high',
    polygonText: '',
  });
  const [checkData, setCheckData] = useState({ traveler_id: '', lat: '', lng: '' });
  const [checkResult, setCheckResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [z, a] = await Promise.all([
        api.get('/geofence/zones'),
        api.get('/geofence/alerts?limit=50'),
      ]);
      setZones(z.data.data || []);
      setAlerts(a.data.data || []);
    } catch (err) {
      toast.error('Failed to load geofence data');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createZone = async (e) => {
    e.preventDefault();
    try {
      const polygon = JSON.parse(newZone.polygonText);
      await api.post('/geofence/zones', {
        name: newZone.name,
        description: newZone.description,
        risk_level: newZone.risk_level,
        polygon,
      });
      toast.success('Zone created');
      setShowCreate(false);
      setNewZone({ name: '', description: '', risk_level: 'high', polygonText: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.message || 'Create failed');
    }
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Deactivate this zone?')) return;
    try {
      await api.delete(`/geofence/zones/${id}`);
      toast.success('Zone deactivated');
      load();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const runCheck = async (e) => {
    e.preventDefault();
    setCheckResult(null);
    try {
      const res = await api.post('/geofence/check', {
        traveler_id: parseInt(checkData.traveler_id),
        current_coordinates: { lat: parseFloat(checkData.lat), lng: parseFloat(checkData.lng) },
      });
      setCheckResult(res.data);
      if (res.data.in_risk_zone) toast.warning(`Traveler is in ${res.data.triggered_zones.length} risk zone(s)!`);
      else toast.success('Traveler is in a safe area');
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Check failed');
    }
  };

  const riskColor = (lvl) => ({ critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' })[lvl] || '#6b7280';

  return (
    <div className="page">
      <div className="page-header">
        <h1>Geofence Management</h1>
        <p>Define risk zones, check traveler locations, and review trigger history</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${tab === 'zones' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('zones')}>Zones ({zones.length})</button>
        <button className={`btn ${tab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('alerts')}>Trigger History ({alerts.length})</button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ New Zone</button>
        <button className="btn btn-secondary" onClick={() => setShowCheck(true)}>📍 Check Traveler</button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && tab === 'zones' && (
        <div className="card" style={{ padding: 16 }}>
          {zones.length === 0 ? <p>No active zones.</p> : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr><th>Name</th><th>Risk</th><th>Description</th><th>Polygon Points</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 8 }}>{z.name}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 4, background: riskColor(z.risk_level), color: '#fff', fontSize: 12 }}>{z.risk_level}</span></td>
                    <td>{z.description}</td>
                    <td>{Array.isArray(z.polygon) ? z.polygon.length : (typeof z.polygon === 'string' ? JSON.parse(z.polygon).length : '?')}</td>
                    <td>{new Date(z.created_at).toLocaleString()}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => deleteZone(z.id)}>Deactivate</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && tab === 'alerts' && (
        <div className="card" style={{ padding: 16 }}>
          {alerts.length === 0 ? <p>No trigger history.</p> : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr><th>Triggered</th><th>Zone</th><th>Risk</th><th>Traveler</th><th>Coords</th><th>Status</th></tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 8 }}>{new Date(a.triggered_at).toLocaleString()}</td>
                    <td>{a.zone_name}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 4, background: riskColor(a.risk_level), color: '#fff', fontSize: 12 }}>{a.risk_level}</span></td>
                    <td>#{a.traveler_id}</td>
                    <td><small>{JSON.stringify(typeof a.coordinates === 'string' ? JSON.parse(a.coordinates) : a.coordinates)}</small></td>
                    <td>{a.acknowledged ? '✓ Ack' : '⚠ Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={createZone} className="card" style={{ padding: 24, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Create Geofence Zone</h3>
            <label>Name</label>
            <input value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} className="form-input" required maxLength={255} />

            <label style={{ marginTop: 12 }}>Description</label>
            <textarea value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} className="form-input" rows={2} maxLength={1000} />

            <label style={{ marginTop: 12 }}>Risk Level</label>
            <select value={newZone.risk_level} onChange={(e) => setNewZone({ ...newZone, risk_level: e.target.value })} className="form-input">
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>

            <label style={{ marginTop: 12 }}>Polygon (JSON array of {`{lat, lng}`}, min 3 points)</label>
            <textarea value={newZone.polygonText} onChange={(e) => setNewZone({ ...newZone, polygonText: e.target.value })} className="form-input" rows={6} required
              placeholder='[{"lat":40.7,"lng":-74.0},{"lat":40.71,"lng":-74.0},{"lat":40.71,"lng":-73.99}]' style={{ fontFamily: 'monospace', fontSize: 12 }} />

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {showCheck && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={runCheck} className="card" style={{ padding: 24, width: 500 }}>
            <h3>Check Traveler Location</h3>
            <label>Traveler ID</label>
            <input type="number" value={checkData.traveler_id} onChange={(e) => setCheckData({ ...checkData, traveler_id: e.target.value })} className="form-input" required />

            <label style={{ marginTop: 12 }}>Latitude</label>
            <input type="number" step="any" value={checkData.lat} onChange={(e) => setCheckData({ ...checkData, lat: e.target.value })} className="form-input" required />

            <label style={{ marginTop: 12 }}>Longitude</label>
            <input type="number" step="any" value={checkData.lng} onChange={(e) => setCheckData({ ...checkData, lng: e.target.value })} className="form-input" required />

            {checkResult && (
              <div style={{ marginTop: 16, padding: 12, background: checkResult.in_risk_zone ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', borderRadius: 8 }}>
                {checkResult.in_risk_zone ? (
                  <>
                    <strong>⚠️ IN RISK ZONE</strong>
                    <p>Triggered {checkResult.triggered_zones.length} zone(s): {checkResult.triggered_zones.map((z) => z.name).join(', ')}</p>
                    <p>Highest risk: {checkResult.alert?.highest_risk}</p>
                  </>
                ) : (
                  <strong>✓ Safe area — no zones triggered</strong>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCheck(false); setCheckResult(null); }}>Close</button>
              <button type="submit" className="btn btn-primary">Check</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Geofence;
