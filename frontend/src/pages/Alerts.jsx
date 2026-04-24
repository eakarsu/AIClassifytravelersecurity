import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Alerts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    category: 'all',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);

  const emptyForm = {
    title: '',
    description: '',
    severity: 'medium',
    category: '',
    region: '',
    country: '',
    city: '',
    source: '',
    status: 'active',
    affected_travelers: 0,
    latitude: '',
    longitude: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/alerts');
      setItems(response.data.alerts || response.data || []);
    } catch (err) {
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const categories = [...new Set(items.map((a) => a.category).filter(Boolean))];

  const filteredItems = items.filter((item) => {
    if (filters.severity !== 'all' && item.severity !== filters.severity) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDetail = (item) => {
    setSelectedItem(item);
    setAiOutput(null);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setAiOutput(null);
  };

  const openForm = (item = null) => {
    setEditItem(item);
    setFormData(item ? { ...emptyForm, ...item } : { ...emptyForm });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/alerts/${editItem._id || editItem.id}`, formData);
        toast.success('Alert updated successfully');
      } else {
        await api.post('/alerts', formData);
        toast.success('Alert created successfully');
      }
      closeForm();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alert');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await api.delete(`/alerts/${item._id || item.id}`);
      toast.success('Alert deleted successfully');
      setSelectedItem(null);
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to delete alert');
    }
  };

  const parseAiOutput = (text) => {
    if (!text) return null;
    const sections = text.split(/\n(?=#{1,3}\s|[A-Z][A-Za-z\s]+:)/);
    return sections.map((section, idx) => {
      const headerMatch = section.match(/^(#{1,3}\s+)?(.+?)[\n:]/);
      if (headerMatch) {
        const header = headerMatch[2].trim().replace(/^#+\s*/, '');
        const body = section.slice(headerMatch[0].length).trim();
        return (
          <div key={idx} style={{ marginBottom: '12px' }}>
            <h5>{header}</h5>
            {body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        );
      }
      return section.split('\n').map((line, i) => (
        <p key={`${idx}-${i}`}>{line}</p>
      ));
    });
  };

  const handleAiClassify = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiOutput(null);
    try {
      const response = await api.post('/ai/classify-alert', selectedItem);
      const result = response.data;
      setAiOutput(result.classification || result.result || result.message || JSON.stringify(result, null, 2));
    } catch (err) {
      toast.error('AI classification failed');
    } finally {
      setAiLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h2>Security Alerts</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>
          Add New
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.severity}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">No alerts found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Category</th>
              <th>Country / City</th>
              <th>Source</th>
              <th>Status</th>
              <th>Affected</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} onClick={() => openDetail(item)}>
                <td>
                  <span className={`badge badge-${item.severity}`}>{item.severity}</span>
                </td>
                <td>{item.title}</td>
                <td>{item.category}</td>
                <td>
                  {item.country}
                  {item.city ? ` / ${item.city}` : ''}
                </td>
                <td>{item.source}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
                <td>{item.affected_travelers ?? '—'}</td>
                <td>{formatDate(item.created_at || item.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedItem.title}</h3>
              <button className="btn btn-secondary" onClick={closeDetail}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Severity</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.severity}`}>
                      {selectedItem.severity}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.status}`}>
                      {selectedItem.status}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedItem.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">{selectedItem.region || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{selectedItem.city || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Source</span>
                  <span className="detail-value">{selectedItem.source || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Affected Travelers</span>
                  <span className="detail-value">{selectedItem.affected_travelers ?? '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Latitude</span>
                  <span className="detail-value">{selectedItem.latitude || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Longitude</span>
                  <span className="detail-value">{selectedItem.longitude || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">
                    {formatDate(selectedItem.created_at || selectedItem.date)}
                  </span>
                </div>
              </div>

              {selectedItem.description && (
                <div className="detail-item" style={{ marginTop: '16px' }}>
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description}</span>
                </div>
              )}

              {/* AI Classification */}
              <div style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-success"
                  onClick={handleAiClassify}
                  disabled={aiLoading}
                >
                  {aiLoading ? 'Classifying...' : 'AI Classify'}
                </button>
              </div>

              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                </div>
              )}

              {aiOutput && (
                <div className="ai-output">
                  <div className="ai-output-header">AI Classification Result</div>
                  <div className="ai-output-content">{parseAiOutput(aiOutput)}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  closeDetail();
                  openForm(selectedItem);
                }}
              >
                Edit
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedItem)}>
                Delete
              </button>
              <button className="btn btn-secondary" onClick={closeDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Alert' : 'New Alert'}</h3>
              <button className="btn btn-secondary" onClick={closeForm}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    value={formData.title}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Severity</label>
                    <select
                      name="severity"
                      className="form-select"
                      value={formData.severity}
                      onChange={handleFormChange}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleFormChange}
                    >
                      <option value="active">Active</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      name="category"
                      className="form-input"
                      value={formData.category}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Source</label>
                    <input
                      type="text"
                      name="source"
                      className="form-input"
                      value={formData.source}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Region</label>
                    <input
                      type="text"
                      name="region"
                      className="form-input"
                      value={formData.region}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="country"
                      className="form-input"
                      value={formData.country}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      value={formData.city}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Affected Travelers</label>
                    <input
                      type="number"
                      name="affected_travelers"
                      className="form-input"
                      value={formData.affected_travelers}
                      onChange={handleFormChange}
                      min={0}
                    />
                  </div>

                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      className="form-input"
                      value={formData.latitude}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="text"
                      name="longitude"
                      className="form-input"
                      value={formData.longitude}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
