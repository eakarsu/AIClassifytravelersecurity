import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const CONTACT_TYPES = ['embassy', 'hospital', 'police', 'fire', 'local_guide', 'insurance', 'company', 'other'];

const Contacts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ contact_type: 'all', country: 'all' });

  const emptyForm = {
    name: '',
    organization: '',
    role: '',
    country: '',
    region: '',
    phone: '',
    email: '',
    contact_type: 'embassy',
    available_24h: false,
    languages: '',
    notes: '',
    priority: 1,
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchItems = async () => {
    try {
      const response = await api.get('/contacts');
      setItems(response.data);
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const uniqueCountries = [...new Set(items.map((i) => i.country).filter(Boolean))].sort();

  const filtered = items.filter((item) => {
    if (filters.contact_type !== 'all' && item.contact_type !== filters.contact_type) return false;
    if (filters.country !== 'all' && item.country !== filters.country) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(s) ||
        (item.organization || '').toLowerCase().includes(s) ||
        (item.role || '').toLowerCase().includes(s) ||
        (item.country || '').toLowerCase().includes(s) ||
        (item.phone || '').toLowerCase().includes(s) ||
        (item.email || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const openAdd = () => {
    setEditItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '',
      organization: item.organization || '',
      role: item.role || '',
      country: item.country || '',
      region: item.region || '',
      phone: item.phone || '',
      email: item.email || '',
      contact_type: item.contact_type || 'embassy',
      available_24h: item.available_24h || false,
      languages: item.languages || '',
      notes: item.notes || '',
      priority: item.priority || 1,
    });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/contacts/${editItem.id}`, formData);
        toast.success('Contact updated');
      } else {
        await api.post('/contacts', formData);
        toast.success('Contact created');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update contact' : 'Failed to create contact');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete contact "${item.name}"?`)) return;
    try {
      await api.delete(`/contacts/${item.id}`);
      toast.success('Contact deleted');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'priority' ? Number(value) : value,
    }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Emergency Contacts</h1>
        <p>Manage emergency contacts worldwide</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          value={filters.contact_type}
          onChange={(e) => setFilters((f) => ({ ...f, contact_type: e.target.value }))}
        >
          <option value="all">All Types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.country}
          onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
        >
          <option value="all">All Countries</option>
          {uniqueCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="data-table-container">
        <div className="data-table-header">
          <span>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">No contacts found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Organization</th>
                <th>Role</th>
                <th>Country</th>
                <th>Phone</th>
                <th>Type</th>
                <th>24h Available</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                  <td>{item.name}</td>
                  <td>{item.organization}</td>
                  <td>{item.role}</td>
                  <td>{item.country}</td>
                  <td>{item.phone}</td>
                  <td><span className={`badge badge-${item.contact_type}`}>{item.contact_type?.replace('_', ' ')}</span></td>
                  <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                    {item.available_24h
                      ? <span style={{ color: '#22c55e' }}>&#10004;</span>
                      : <span style={{ color: '#ef4444' }}>&#10008;</span>
                    }
                  </td>
                  <td>{item.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{selectedItem.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Organization</span>
                  <span className="detail-value">{selectedItem.organization}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{selectedItem.role}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact Type</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.contact_type}`}>{selectedItem.contact_type?.replace('_', ' ')}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">{selectedItem.region || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{selectedItem.phone}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selectedItem.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">24h Available</span>
                  <span className="detail-value">
                    {selectedItem.available_24h
                      ? <span style={{ color: '#22c55e', fontWeight: 'bold' }}>&#10004; Yes</span>
                      : <span style={{ color: '#ef4444', fontWeight: 'bold' }}>&#10008; No</span>
                    }
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className="detail-value">{selectedItem.priority}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Languages</span>
                  <span className="detail-value">{selectedItem.languages || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{selectedItem.notes || '—'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => openEdit(selectedItem)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedItem)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Contact' : 'New Contact'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Organization</label>
                    <input className="form-input" name="organization" value={formData.organization} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <input className="form-input" name="role" value={formData.role} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Contact Type</label>
                    <select className="form-select" name="contact_type" value={formData.contact_type} onChange={handleChange}>
                      {CONTACT_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Country</label>
                    <input className="form-input" name="country" value={formData.country} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input className="form-input" name="region" value={formData.region} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input className="form-input" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-input" name="email" type="email" value={formData.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Languages</label>
                    <input className="form-input" name="languages" value={formData.languages} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <input className="form-input" type="number" name="priority" value={formData.priority} onChange={handleChange} min={1} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                  <input
                    type="checkbox"
                    id="available_24h"
                    name="available_24h"
                    checked={formData.available_24h}
                    onChange={handleChange}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: '#22c55e', cursor: 'pointer' }}
                  />
                  <label htmlFor="available_24h" style={{ cursor: 'pointer', fontWeight: 500 }}>Available 24 Hours</label>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-textarea" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
