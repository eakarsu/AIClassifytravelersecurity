import React, { useState, useEffect } from 'react';
import api from '../../api';

const sevColor = (s) => ({ high: '#ef4444', medium: '#f97316', low: '#22c55e' }[s] || '#3b82f6');

export default function TravelerFlowChart() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/custom-views/traveler-flow', {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed');
    }
    setLoading(false);
  };

  useEffect(() => { run(); }, []);

  const series = data?.data?.series || [];
  const chokepoints = data?.data?.chokepoints || [];

  // Compute max throughput for scaling
  const maxT = series.reduce((m, s) => Math.max(m, ...s.points.map((p) => p.throughput)), 1);
  const colors = ['#3b82f6', '#a855f7', '#06b6d4', '#f59e0b'];

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Airport Traveler Flow</h2>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? 'Synthesizing…' : 'Refresh'}
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {/* SVG line chart */}
      {series.length > 0 && (
        <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <svg viewBox="0 0 600 220" style={{ width: '100%', height: 220 }}>
            {/* grid */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="40" x2="590" y1={20 + i * 40} y2={20 + i * 40} stroke="#1e293b" strokeWidth="1" />
            ))}
            {/* series */}
            {series.map((s, si) => {
              const pts = s.points.map((p, i) => {
                const x = 40 + i * ((550) / Math.max(1, s.points.length - 1));
                const y = 200 - (p.throughput / maxT) * 170;
                return `${x},${y}`;
              }).join(' ');
              return (
                <g key={s.terminal}>
                  <polyline points={pts} fill="none" stroke={colors[si % colors.length]} strokeWidth="2.5" />
                  {s.points.map((p, i) => {
                    const x = 40 + i * ((550) / Math.max(1, s.points.length - 1));
                    const y = 200 - (p.throughput / maxT) * 170;
                    return <circle key={i} cx={x} cy={y} r="3" fill={colors[si % colors.length]} />;
                  })}
                </g>
              );
            })}
            {/* x labels */}
            {(series[0]?.points || []).map((p, i) => {
              const x = 40 + i * ((550) / Math.max(1, series[0].points.length - 1));
              return <text key={i} x={x} y={215} fill="#64748b" fontSize="10" textAnchor="middle">{p.time}</text>;
            })}
          </svg>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
            {series.map((s, si) => (
              <div key={s.terminal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, background: colors[si % colors.length], display: 'inline-block' }} />
                <span>{s.terminal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chokepoints */}
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Chokepoints</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {chokepoints.map((c, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 12, background: '#0f172a', borderRadius: 8,
            borderLeft: `4px solid ${sevColor(c.severity)}`,
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.location}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.recommendation}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: sevColor(c.severity), fontWeight: 700 }}>{c.wait_min} min</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>{c.severity}</div>
            </div>
          </div>
        ))}
      </div>

      {data?.data?.peak_window && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>
          Peak window: <strong style={{ color: '#f1f5f9' }}>{data.data.peak_window}</strong>
          {' · '}Avg wait: <strong style={{ color: '#f1f5f9' }}>{data.data.overall_wait_min_avg} min</strong>
        </div>
      )}
      {data && <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>source: {data.source}</div>}
    </div>
  );
}
