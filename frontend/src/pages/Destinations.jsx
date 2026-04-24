import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const RISK_OPTIONS = ['low', 'medium', 'high', 'critical'];

const emptyForm = {
  name: '',
  country: '',
  region: '',
  risk_level: 'low',
  risk_score: 0,
  description: '',
  travel_advisory: '',
  health_risks: '',
  entry_requirements: '',
  local_emergency_number: '',
  active_alerts: 0,
  active_travelers: 0,
};

const riskScoreColor = (score) => {
  if (score > 75) return '#ef4444';
  if (score > 50) return '#f97316';
  if (score > 25) return '#eab308';
  return '#22c55e';
};

const Destinations = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ risk_level: 'all', region: 'all' });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/destinations');
      setItems(response.data);
    } catch (err) {
      toast.error('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const regions = [...new Set(items.map((i) => i.region).filter(Boolean))];

  const filtered = items.filter((item) => {
    if (filters.risk_level !== 'all' && item.risk_level !== filters.risk_level) return false;
    if (filters.region !== 'all' && item.region !== filters.region) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.region || '').toLowerCase().includes(q)
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
      country: item.country || '',
      region: item.region || '',
      risk_level: item.risk_level || 'low',
      risk_score: item.risk_score ?? 0,
      description: item.description || '',
      travel_advisory: item.travel_advisory || '',
      health_risks: item.health_risks || '',
      entry_requirements: item.entry_requirements || '',
      local_emergency_number: item.local_emergency_number || '',
      active_alerts: item.active_alerts ?? 0,
      active_travelers: item.active_travelers ?? 0,
    });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      risk_score: Number(formData.risk_score),
      active_alerts: Number(formData.active_alerts),
      active_travelers: Number(formData.active_travelers),
    };
    try {
      if (editItem) {
        await api.put(`/destinations/${editItem.id}`, payload);
        toast.success('Destination updated successfully');
      } else {
        await api.post('/destinations', payload);
        toast.success('Destination created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update destination' : 'Failed to create destination');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this destination?')) return;
    try {
      await api.delete(`/destinations/${item.id}`);
      toast.success('Destination deleted successfully');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete destination');
    }
  };

  const handleAiAssess = async (item) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/assess-risk', {
        name: item.name,
        country: item.country,
        active_alerts: item.active_alerts,
      });
      setAiResult(response.data);
    } catch (err) {
      toast.error('Failed to get AI risk assessment');
    } finally {
      setAiLoading(false);
    }
  };

  const renderAiOutput = (data) => {
    if (!data) return null;
    if (typeof data === 'string') {
      return <p>{data}</p>;
    }
    const entries = Object.entries(data);
    return (
      <div>
        {entries.map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              return (
                <div key={key} style={{ marginBottom: '12px' }}>
                  <strong>{label}:</strong>
                  <ul style={{ margin: '4px 0 0 20px' }}>
                    {value.map((v, i) => (
                      <li key={i}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <div key={key} style={{ marginBottom: '12px' }}>
                <strong>{label}:</strong>
                <div style={{ marginLeft: '12px', marginTop: '4px' }}>
                  {Object.entries(value).map(([k, v]) => (
                    <div key={k}>
                      <em>{k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}:</em> {String(v)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <div key={key} style={{ marginBottom: '8px' }}>
              <strong>{label}:</strong> {String(value)}
            </div>
          );
        })}
      </div>
    );
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
        <h1>Destinations</h1>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search destinations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          value={filters.risk_level}
          onChange={(e) => setFilters((f) => ({ ...f, risk_level: e.target.value }))}
        >
          <option value="all">All Risk Levels</option>
          {RISK_OPTIONS.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
        >
          <option value="all">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No destinations found</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
              <th>Region</th>
              <th>Risk Level</th>
              <th>Risk Score</th>
              <th>Active Alerts</th>
              <th>Active Travelers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} style={{ cursor: 'pointer' }}>
                <td>{item.name}</td>
                <td>{item.country}</td>
                <td>{item.region}</td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
                <td>
                  <div className="risk-score-bar">
                    <div
                      className="risk-score-fill"
                      style={{
                        width: `${item.risk_score || 0}%`,
                        backgroundColor: riskScoreColor(item.risk_score || 0),
                      }}
                    ></div>
                  </div>
                  {item.risk_score}
                </td>
                <td>{item.active_alerts}</td>
                <td>{item.active_travelers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>X</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{selectedItem.name}</span>
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
                  <span className="detail-label">Risk Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Score</span>
                  <span className="detail-value">
                    <div className="risk-score-bar">
                      <div
                        className="risk-score-fill"
                        style={{
                          width: `${selectedItem.risk_score || 0}%`,
                          backgroundColor: riskScoreColor(selectedItem.risk_score || 0),
                        }}
                      ></div>
                    </div>
                    {selectedItem.risk_score}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Active Alerts</span>
                  <span className="detail-value">{selectedItem.active_alerts}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Active Travelers</span>
                  <span className="detail-value">{selectedItem.active_travelers}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Travel Advisory</span>
                  <span className="detail-value">{selectedItem.travel_advisory}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Health Risks</span>
                  <span className="detail-value">{selectedItem.health_risks}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Entry Requirements</span>
                  <span className="detail-value">{selectedItem.entry_requirements}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Local Emergency Number</span>
                  <span className="detail-value">{selectedItem.local_emergency_number}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleAiAssess(selectedItem)}
                  disabled={aiLoading}
                >
                  <span className="ai-icon">AI</span> Risk Assessment
                </button>
              </div>

              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                  <span>Analyzing...</span>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div className="ai-output">
                  <div className="ai-output-header">
                    <span className="ai-icon">AI</span> Risk Assessment
                  </div>
                  <div className="ai-output-content">
                    {renderAiOutput(aiResult)}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => openEdit(selectedItem)}>Edit</button>
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
              <h2>{editItem ? 'Edit Destination' : 'Add New Destination'}</h2>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>X</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="country"
                      className="form-input"
                      value={formData.country}
                      onChange={handleChange}
                      required
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
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Risk Level</label>
                    <select name="risk_level" className="form-select" value={formData.risk_level} onChange={handleChange}>
                      {RISK_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Risk Score (0-100)</label>
                    <input
                      type="number"
                      name="risk_score"
                      className="form-input"
                      min="0"
                      max="100"
                      value={formData.risk_score}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Local Emergency Number</label>
                    <input
                      type="text"
                      name="local_emergency_number"
                      className="form-input"
                      value={formData.local_emergency_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Travel Advisory</label>
                  <textarea
                    name="travel_advisory"
                    className="form-textarea"
                    value={formData.travel_advisory}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Health Risks</label>
                  <textarea
                    name="health_risks"
                    className="form-textarea"
                    value={formData.health_risks}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Entry Requirements</label>
                  <textarea
                    name="entry_requirements"
                    className="form-textarea"
                    value={formData.entry_requirements}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Active Alerts</label>
                    <input
                      type="number"
                      name="active_alerts"
                      className="form-input"
                      min="0"
                      value={formData.active_alerts}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Active Travelers</label>
                    <input
                      type="number"
                      name="active_travelers"
                      className="form-input"
                      min="0"
                      value={formData.active_travelers}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Destinations;
