import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const ADVISORY_LEVEL_LABELS = {
  do_not_travel: 'Do Not Travel',
  reconsider: 'Reconsider Travel',
  exercise_caution: 'Exercise Caution',
  normal: 'Normal',
};

const STATUS_OPTIONS = ['active', 'expired', 'updated', 'withdrawn'];
const LEVEL_OPTIONS = ['do_not_travel', 'reconsider', 'exercise_caution', 'normal'];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
};

const emptyForm = {
  title: '',
  country: '',
  region: '',
  advisory_level: 'normal',
  issued_by: '',
  issued_date: '',
  expiry_date: '',
  description: '',
  key_risks: '',
  recommendations: '',
  status: 'active',
};

const Advisories = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ advisory_level: 'all', status: 'all' });
  const [formData, setFormData] = useState(emptyForm);
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/advisories');
      setItems(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      toast.error('Failed to load advisories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    if (filters.advisory_level !== 'all' && item.advisory_level !== filters.advisory_level) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.region || '').toLowerCase().includes(q) ||
        (item.issued_by || '').toLowerCase().includes(q)
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
      title: item.title || '',
      country: item.country || '',
      region: item.region || '',
      advisory_level: item.advisory_level || 'normal',
      issued_by: item.issued_by || '',
      issued_date: item.issued_date || '',
      expiry_date: item.expiry_date || '',
      description: item.description || '',
      key_risks: item.key_risks || '',
      recommendations: item.recommendations || '',
      status: item.status || 'active',
    });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/advisories/${editItem.id}`, formData);
        toast.success('Advisory updated successfully');
      } else {
        await api.post('/advisories', formData);
        toast.success('Advisory created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update advisory' : 'Failed to create advisory');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await api.delete(`/advisories/${item.id}`);
      toast.success('Advisory deleted successfully');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete advisory');
    }
  };

  const handleAiGenerate = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiOutput('');
    try {
      const response = await api.post('/ai/generate-advisory', {
        country: selectedItem.country,
        region: selectedItem.region,
        description: selectedItem.description,
        key_risks: selectedItem.key_risks,
      });
      setAiOutput(response.data.summary || response.data.result || JSON.stringify(response.data, null, 2));
    } catch (err) {
      toast.error('Failed to generate AI summary');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Travel Advisories</h1>
        <p>Monitor and manage travel advisories worldwide</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search advisories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          value={filters.advisory_level}
          onChange={(e) => setFilters((f) => ({ ...f, advisory_level: e.target.value }))}
        >
          <option value="all">All Levels</option>
          {LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>{ADVISORY_LEVEL_LABELS[level]}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="data-table-container">
        <div className="data-table-header">
          <span>{filtered.length} advisory{filtered.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">No advisories found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Advisory Level</th>
                <th>Title</th>
                <th>Country</th>
                <th>Region</th>
                <th>Issued By</th>
                <th>Issued Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setAiOutput(''); }} style={{ cursor: 'pointer' }}>
                  <td><span className={`badge badge-${item.advisory_level}`}>{ADVISORY_LEVEL_LABELS[item.advisory_level] || item.advisory_level}</span></td>
                  <td>{item.title}</td>
                  <td>{item.country}</td>
                  <td>{item.region}</td>
                  <td>{item.issued_by}</td>
                  <td>{formatDate(item.issued_date)}</td>
                  <td>{formatDate(item.expiry_date)}</td>
                  <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
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
              <h2>{selectedItem.title}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Advisory Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.advisory_level}`}>
                      {ADVISORY_LEVEL_LABELS[selectedItem.advisory_level] || selectedItem.advisory_level}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">{selectedItem.region}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Issued By</span>
                  <span className="detail-value">{selectedItem.issued_by}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Issued Date</span>
                  <span className="detail-value">{formatDate(selectedItem.issued_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expiry Date</span>
                  <span className="detail-value">{formatDate(selectedItem.expiry_date)}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Key Risks</span>
                  <span className="detail-value">{selectedItem.key_risks}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Recommendations</span>
                  <span className="detail-value">{selectedItem.recommendations}</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-success" onClick={handleAiGenerate} disabled={aiLoading}>
                  <span className="ai-icon">&#9733;</span> AI Generate Summary
                </button>
              </div>

              {(aiLoading || aiOutput) && (
                <div className="ai-output">
                  <div className="ai-output-header">
                    <span className="ai-icon">&#9733;</span> AI Generated Summary
                  </div>
                  <div className="ai-output-content">
                    {aiLoading ? (
                      <div className="ai-loading"><div className="spinner"></div> Generating...</div>
                    ) : (
                      aiOutput
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => openEdit(selectedItem)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedItem)}>Delete</button>
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Advisory' : 'Add New Advisory'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Country</label>
                    <input className="form-input" value={formData.country} onChange={(e) => handleFormChange('country', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input className="form-input" value={formData.region} onChange={(e) => handleFormChange('region', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Advisory Level</label>
                    <select className="form-select" value={formData.advisory_level} onChange={(e) => handleFormChange('advisory_level', e.target.value)}>
                      {LEVEL_OPTIONS.map((level) => (
                        <option key={level} value={level}>{ADVISORY_LEVEL_LABELS[level]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => handleFormChange('status', e.target.value)}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Issued By</label>
                  <input className="form-input" value={formData.issued_by} onChange={(e) => handleFormChange('issued_by', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Issued Date</label>
                    <input className="form-input" type="date" value={formData.issued_date} onChange={(e) => handleFormChange('issued_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input className="form-input" type="date" value={formData.expiry_date} onChange={(e) => handleFormChange('expiry_date', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-textarea" value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} rows={3} />
                </div>
                <div className="form-group">
                  <label>Key Risks</label>
                  <textarea className="form-textarea" value={formData.key_risks} onChange={(e) => handleFormChange('key_risks', e.target.value)} rows={3} />
                </div>
                <div className="form-group">
                  <label>Recommendations</label>
                  <textarea className="form-textarea" value={formData.recommendations} onChange={(e) => handleFormChange('recommendations', e.target.value)} rows={3} />
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

export default Advisories;
