import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function ScreeningRulesEditor() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ when: '', then: 'secondary_screening', weight: 20, enabled: true });

  const load = async (rules = []) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/custom-views/screening-rules', { rules });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed');
    }
    setLoading(false);
  };

  useEffect(() => { load([]); }, []);

  const addRule = async () => {
    if (!draft.when.trim()) { setError('Condition (when) is required'); return; }
    const current = (data?.data?.rules || []).map((r) => ({
      id: r.id, when: r.when, then: r.then, weight: r.weight, enabled: r.enabled,
    }));
    const next = [...current.filter((r) => !String(r.id).startsWith('R-00')), {
      ...draft, id: `R-${Date.now().toString().slice(-4)}`,
    }];
    await load(next);
    setDraft({ when: '', then: 'secondary_screening', weight: 20, enabled: true });
  };

  const toggle = (id) => {
    const rules = (data?.data?.rules || []).map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r,
    );
    setData({ ...data, data: { ...data.data, rules } });
  };

  const remove = (id) => {
    const rules = (data?.data?.rules || []).filter((r) => r.id !== id);
    setData({ ...data, data: { ...data.data, rules } });
  };

  const rules = data?.data?.rules || [];
  const suggestions = data?.data?.suggestions || [];
  const validation = data?.data?.validation || {};

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Screening Rules Editor</h2>
        <button className="btn btn-primary btn-sm" onClick={() => load([])} disabled={loading}>
          {loading ? 'Synthesizing…' : 'Reload Baseline'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {/* Add rule */}
      <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Add New Rule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#64748b' }}>When (condition)</label>
            <input className="form-input" placeholder="e.g., precheck_member AND score < 30"
              value={draft.when} onChange={(e) => setDraft({ ...draft, when: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b' }}>Then (action)</label>
            <select className="form-input" value={draft.then} onChange={(e) => setDraft({ ...draft, then: e.target.value })}>
              <option value="expedited">expedited</option>
              <option value="manual_review">manual_review</option>
              <option value="enhanced_questions">enhanced_questions</option>
              <option value="secondary_screening">secondary_screening</option>
              <option value="refuse_boarding">refuse_boarding</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b' }}>Weight</label>
            <input className="form-input" type="number" value={draft.weight}
              onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} />
          </div>
          <button className="btn btn-success" onClick={addRule} disabled={loading}>Add</button>
        </div>
      </div>

      {/* Rules table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
            <th style={{ padding: '8px 4px' }}>ID</th>
            <th>When</th>
            <th>Then</th>
            <th>Weight</th>
            <th>Enabled</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #1e293b', opacity: r.enabled ? 1 : 0.45 }}>
              <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{r.id}</td>
              <td style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{r.when}</td>
              <td><span style={{ background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>{r.then}</span></td>
              <td><strong style={{ color: r.weight < 0 ? '#22c55e' : '#f97316' }}>{r.weight > 0 ? `+${r.weight}` : r.weight}</strong></td>
              <td>
                <button className="btn btn-sm btn-secondary" onClick={() => toggle(r.id)}>
                  {r.enabled ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Validation</div>
          <div style={{ fontSize: 13 }}>
            Coverage estimate: <strong>{validation.coverage_estimate_pct || 0}%</strong><br />
            Duplicates: <strong>{validation.duplicates || 0}</strong><br />
            Conflicts: <strong>{(validation.conflicts || []).length}</strong>
          </div>
        </div>
        <div style={{ background: '#0f172a', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>AI Suggestions</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1' }}>
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {data && <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>source: {data.source}</div>}
    </div>
  );
}
