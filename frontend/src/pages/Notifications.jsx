import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setItems(Array.isArray(res.data) ? res.data : (res.data.notifications || res.data.items || []));
      try {
        const c = await api.get('/notifications/unread-count');
        setUnread(c.data.count || c.data.unread || 0);
      } catch (_) {}
    } catch (err) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications', form);
      toast.success('Notification created');
      setShowForm(false);
      setForm({ title: '', message: '', type: 'info', user_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); load(); } catch (err) { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try { await api.post('/notifications/mark-all-read'); load(); } catch (err) { toast.error('Failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await api.delete(`/notifications/${id}`); load(); } catch (err) { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <h3 style={{ margin: 0 }}>{unread} unread notifications</h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={markAllRead}>Mark all read</button>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New Notification'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card" style={{ padding: 24, marginBottom: 16, maxWidth: 600 }} onSubmit={handleCreate}>
          <div className="form-group">
            <label>Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea className="form-input" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={3} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="form-group">
            <label>User ID (optional)</label>
            <input className="form-input" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      {loading ? <div>Loading...</div> : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Message</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(n => (
                <tr key={n.id}>
                  <td><strong>{n.title}</strong></td>
                  <td>{n.message}</td>
                  <td>{n.type || 'info'}</td>
                  <td>{n.read || n.is_read ? 'read' : 'unread'}</td>
                  <td>{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</td>
                  <td>
                    {!(n.read || n.is_read) && <button className="btn btn-sm" onClick={() => markRead(n.id)}>Read</button>}{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>No notifications</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Notifications;
