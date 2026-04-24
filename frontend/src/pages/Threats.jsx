import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Threats = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    threat_level: 'all',
    status: 'all',
    threat_type: 'all',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);

  const emptyForm = {
    title: '',
    threat_type: '',
    region: '',
    country: '',
    threat_level: 'medium',
    description: '',
    potential_impact: '',
    affected_areas: '',
    mitigation_strategies: '',
    intelligence_source: '',
    confidence_level: 'moderate',
    valid_from: '',
    valid_until: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/threats');
      setItems(response.data.threats || response.data || []);
    } catch (err) {
      toast.error('Failed to fetch threats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, []);

  const threatTypes = [...new Set(items.map((t) => t.threat_type).filter(Boolean))];

  const filteredItems = items.filter((item) => {
    if (filters.threat_level !== 'all' && item.threat_level !== filters.threat_level) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.threat_type !== 'all' && item.threat_type !== filters.threat_type) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.threat_type || '').toLowerCase().includes(q) ||
        (item.region || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
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
        await api.put(`/threats/${editItem._id || editItem.id}`, formData);
        toast.success('Threat updated successfully');
      } else {
        await api.post('/threats', formData);
        toast.success('Threat created successfully');
      }
      closeForm();
      fetchThreats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save threat');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await api.delete(`/threats/${item._id || item.id}`);
      toast.success('Threat deleted successfully');
      setSelectedItem(null);
      fetchThreats();
    } catch (err) {
      toast.error('Failed to delete threat');
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

  const handleAiAnalyze = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiOutput(null);
    try {
      const response = await api.post('/ai/analyze-threat', {
        title: selectedItem.title,
        description: selectedItem.description,
        region: selectedItem.region,
        threat_type: selectedItem.threat_type,
      });
      const result = response.data;
      setAiOutput(result.analysis || result.result || result.message || JSON.stringify(result, null, 2));
    } catch (err) {
      toast.error('AI threat analysis failed');
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
        <h2>Threat Analysis</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>
          Add New
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.threat_level}
          onChange={(e) => setFilters((f) => ({ ...f, threat_level: e.target.value }))}
        >
          <option value="all">All Threat Levels</option>
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
          <option value="expired">Expired</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          className="form-select"
          value={filters.threat_type}
          onChange={(e) => setFilters((f) => ({ ...f, threat_type: e.target.value }))}
        >
          <option value="all">All Types</option>
          {threatTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search threats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">No threats found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Threat Level</th>
              <th>Title</th>
              <th>Type</th>
              <th>Region / Country</th>
              <th>Confidence</th>
              <th>Valid Period</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} onClick={() => openDetail(item)}>
                <td>
                  <span className={`badge badge-${item.threat_level}`}>{item.threat_level}</span>
                </td>
                <td>{item.title}</td>
                <td>{item.threat_type}</td>
                <td>
                  {item.region || '—'}
                  {item.country ? ` / ${item.country}` : ''}
                </td>
                <td>
                  <span className={`badge badge-${item.confidence_level}`}>{item.confidence_level}</span>
                </td>
                <td>
                  {formatDate(item.valid_from)} — {formatDate(item.valid_until)}
                </td>
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
              <h3>{selectedItem.title}</h3>
              <button className="modal-close" onClick={closeDetail}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Threat Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.threat_level}`}>
                      {selectedItem.threat_level}
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
                  <span className="detail-label">Threat Type</span>
                  <span className="detail-value">{selectedItem.threat_type || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Confidence Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.confidence_level}`}>
                      {selectedItem.confidence_level || '—'}
                    </span>
                  </span>
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
                  <span className="detail-label">Intelligence Source</span>
                  <span className="detail-value">{selectedItem.intelligence_source || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Valid From</span>
                  <span className="detail-value">{formatDate(selectedItem.valid_from)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Valid Until</span>
                  <span className="detail-value">{formatDate(selectedItem.valid_until)}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Potential Impact</span>
                  <span className="detail-value">{selectedItem.potential_impact || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Affected Areas</span>
                  <span className="detail-value">{selectedItem.affected_areas || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Mitigation Strategies</span>
                  <span className="detail-value">{selectedItem.mitigation_strategies || '—'}</span>
                </div>
              </div>

              {/* AI Analyze Threat */}
              <div style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-success"
                  onClick={handleAiAnalyze}
                  disabled={aiLoading}
                >
                  <span className="ai-icon">🤖</span>
                  {aiLoading ? 'Analyzing...' : 'AI Analyze Threat'}
                </button>
              </div>

              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                </div>
              )}

              {aiOutput && (
                <div className="ai-output">
                  <div className="ai-output-header">AI Threat Analysis</div>
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
              <h3>{editItem ? 'Edit Threat' : 'New Threat'}</h3>
              <button className="modal-close" onClick={closeForm}>
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

                <div className="form-row">
                  <div className="form-group">
                    <label>Threat Type</label>
                    <input
                      type="text"
                      name="threat_type"
                      className="form-input"
                      value={formData.threat_type}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Threat Level</label>
                    <select
                      name="threat_level"
                      className="form-select"
                      value={formData.threat_level}
                      onChange={handleFormChange}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
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

                <div className="form-group">
                  <label>Potential Impact</label>
                  <textarea
                    name="potential_impact"
                    className="form-textarea"
                    value={formData.potential_impact}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Affected Areas</label>
                  <textarea
                    name="affected_areas"
                    className="form-textarea"
                    value={formData.affected_areas}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Mitigation Strategies</label>
                  <textarea
                    name="mitigation_strategies"
                    className="form-textarea"
                    value={formData.mitigation_strategies}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Intelligence Source</label>
                    <input
                      type="text"
                      name="intelligence_source"
                      className="form-input"
                      value={formData.intelligence_source}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Confidence Level</label>
                    <select
                      name="confidence_level"
                      className="form-select"
                      value={formData.confidence_level}
                      onChange={handleFormChange}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Valid From</label>
                    <input
                      type="date"
                      name="valid_from"
                      className="form-input"
                      value={formData.valid_from}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Valid Until</label>
                    <input
                      type="date"
                      name="valid_until"
                      className="form-input"
                      value={formData.valid_until}
                      onChange={handleFormChange}
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
                      <option value="monitoring">Monitoring</option>
                      <option value="expired">Expired</option>
                      <option value="resolved">Resolved</option>
                    </select>
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

export default Threats;
