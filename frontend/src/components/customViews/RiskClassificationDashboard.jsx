import React, { useState } from 'react';
import api from '../../api';

const tierColor = (t) => ({ red: '#ef4444', amber: '#f97316', green: '#22c55e' }[t] || '#64748b');

export default function RiskClassificationDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/custom-views/risk-classification', {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed');
    }
    setLoading(false);
  };

  React.useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const s = data?.data?.summary;
  const rows = data?.data?.classified || [];

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Risk Classification Dashboard</h2>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? 'Synthesizing…' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
      {s && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <Stat label="Total" value={s.total} />
          <Stat label="Avg Score" value={s.avg_score} color="#3b82f6" />
          <Stat label="Amber" value={s.amber} color={tierColor('amber')} />
          <Stat label="Red" value={s.red} color={tierColor('red')} />
        </div>
      )}

      {/* Stacked bar of tier mix */}
      {s && (
        <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 16, background: '#0f172a' }}>
          {['green', 'amber', 'red'].map((t) => {
            const pct = (s[t] || 0) / Math.max(1, s.total) * 100;
            return <div key={t} title={`${t}: ${s[t]}`} style={{ width: `${pct}%`, background: tierColor(t) }} />;
          })}
        </div>
      )}

      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '8px 4px' }}>ID</th>
              <th>Name</th>
              <th>Route</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.origin} → {r.destination}</td>
                <td><strong>{r.risk_score}</strong></td>
                <td>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, color: '#fff',
                    background: tierColor(r.tier), fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  }}>{r.tier}</span>
                </td>
                <td style={{ color: '#94a3b8' }}>{r.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>source: {data.source}</div>}
    </div>
  );
}

function Stat({ label, value, color = '#f1f5f9' }) {
  return (
    <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
