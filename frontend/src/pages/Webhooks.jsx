import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Webhooks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: '', active: true });
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/webhooks');
      setItems(Array.isArray(res.data) ? res.data : (res.data.webhooks || res.data.items || []));
    } catch (err) { toast.error('Failed to fetch webhooks'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const body = { ...form, events: form.events.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      await api.post('/webhooks', body);
      toast.success('Webhook saved');
      setShowForm(false);
      setForm({ name: '', url: '', events: '', active: true });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await api.delete(`/webhooks/${id}`); load(); } catch (err) { toast.error('Failed'); }
  };

  const testDeliver = async (id) => {
    setTestResult(null);
    try {
      const res = await api.post(`/webhooks/${id}/test`, { event: 'test', payload: { hello: 'world' } });
      setTestResult({ id, ok: true, data: res.data });
    } catch (err) { setTestResult({ id, ok: false, data: err.response?.data || { error: err.message } }); }
  };

  return (
    <div>
      <div className="page-toolbar">
        <h3 style={{ margin: 0 }}>Outbound webhook registry</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Webhook'}
        </button>
      </div>

      {showForm && (
        <form className="card" style={{ padding: 24, marginBottom: 16, maxWidth: 600 }} onSubmit={handleCreate}>
          <div className="form-group">
            <label>Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>URL</label>
            <input className="form-input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Events (comma-separated)</label>
            <input className="form-input" value={form.events} onChange={e => setForm({ ...form, events: e.target.value })} placeholder="alert.created, sos.triggered" />
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      {testResult && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: testResult.ok ? '#0f2f1a' : '#2f0f0f' }}>
          <strong>Test #{testResult.id}: {testResult.ok ? 'OK' : 'Failed'}</strong>
          <pre style={{ overflow: 'auto', fontSize: 12 }}>{JSON.stringify(testResult.data, null, 2)}</pre>
        </div>
      )}

      {loading ? <div>Loading...</div> : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {items.map(w => (
                <tr key={w.id}>
                  <td><strong>{w.name}</strong></td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</td>
                  <td>{(w.events || []).join(', ')}</td>
                  <td>{w.active ? 'yes' : 'no'}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => testDeliver(w.id)}>Test</button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(w.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>No webhooks</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
