import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Templates = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
  });

  const emptyForm = {
    name: '',
    category: 'general',
    subject: '',
    body: '',
    severity: 'medium',
    channels: '',
    language: 'en',
    placeholders: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/templates');
      setItems(response.data.templates || response.data || []);
    } catch (err) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const formatCategory = (cat) => {
    if (!cat) return '—';
    return cat
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
  };

  const filteredItems = items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.subject || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.body || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDetail = (item) => {
    setSelectedItem(item);
  };

  const closeDetail = () => {
    setSelectedItem(null);
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
        await api.put(`/templates/${editItem._id || editItem.id}`, formData);
        toast.success('Template updated successfully');
      } else {
        await api.post('/templates', formData);
        toast.success('Template created successfully');
      }
      closeForm();
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await api.delete(`/templates/${item._id || item.id}`);
      toast.success('Template deleted successfully');
      setSelectedItem(null);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
    }
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
        <h2>Communication Templates</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>
          Add New
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="all">All Categories</option>
          <option value="evacuation">Evacuation</option>
          <option value="weather">Weather</option>
          <option value="security">Security</option>
          <option value="health">Health</option>
          <option value="general">General</option>
          <option value="check_in">Check-In</option>
          <option value="emergency">Emergency</option>
        </select>

        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">No templates found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Severity</th>
              <th>Channels</th>
              <th>Language</th>
              <th>Usage Count</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} onClick={() => openDetail(item)}>
                <td>{item.name}</td>
                <td>
                  <span className={`badge badge-${item.category}`}>{formatCategory(item.category)}</span>
                </td>
                <td>{item.subject}</td>
                <td>
                  <span className={`badge badge-${item.severity}`}>{item.severity}</span>
                </td>
                <td>{item.channels || '—'}</td>
                <td>{item.language || '—'}</td>
                <td>{item.usage_count ?? 0}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
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
              <h3>{selectedItem.name}</h3>
              <button className="modal-close" onClick={closeDetail}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.category}`}>
                      {formatCategory(selectedItem.category)}
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
                  <span className="detail-label">Severity</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.severity}`}>
                      {selectedItem.severity}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Language</span>
                  <span className="detail-value">{selectedItem.language || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Channels</span>
                  <span className="detail-value">{selectedItem.channels || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Usage Count</span>
                  <span className="detail-value">{selectedItem.usage_count ?? 0}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Subject</span>
                  <span className="detail-value">{selectedItem.subject || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Placeholders</span>
                  <span className="detail-value">{selectedItem.placeholders || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Body</span>
                  <span className="detail-value">
                    <pre
                      style={{
                        background: '#f4f6f8',
                        padding: '16px',
                        borderRadius: '8px',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        fontFamily: 'inherit',
                        fontSize: '0.95em',
                        lineHeight: '1.6',
                        margin: 0,
                      }}
                    >
                      {selectedItem.body || '—'}
                    </pre>
                  </span>
                </div>
              </div>
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
              <h3>{editItem ? 'Edit Template' : 'New Template'}</h3>
              <button className="modal-close" onClick={closeForm}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      className="form-select"
                      value={formData.category}
                      onChange={handleFormChange}
                    >
                      <option value="evacuation">Evacuation</option>
                      <option value="weather">Weather</option>
                      <option value="security">Security</option>
                      <option value="health">Health</option>
                      <option value="general">General</option>
                      <option value="check_in">Check-In</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

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
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    name="subject"
                    className="form-input"
                    value={formData.subject}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Body</label>
                  <textarea
                    name="body"
                    className="form-textarea"
                    value={formData.body}
                    onChange={handleFormChange}
                    style={{ minHeight: '200px' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Channels</label>
                    <input
                      type="text"
                      name="channels"
                      className="form-input"
                      value={formData.channels}
                      onChange={handleFormChange}
                      placeholder="e.g. email, sms, push"
                    />
                  </div>

                  <div className="form-group">
                    <label>Language</label>
                    <input
                      type="text"
                      name="language"
                      className="form-input"
                      value={formData.language}
                      onChange={handleFormChange}
                      placeholder="e.g. en"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Placeholders</label>
                  <textarea
                    name="placeholders"
                    className="form-textarea"
                    value={formData.placeholders}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="e.g. {{traveler_name}}, {{destination}}"
                  />
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
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
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

export default Templates;
