import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Incidents = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ severity: 'all', status: 'all', incident_type: 'all' });
  const [aiOutput, setAiOutput] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const emptyForm = {
    title: '',
    description: '',
    incident_type: '',
    severity: 'medium',
    location: '',
    country: '',
    date_occurred: '',
    reported_by: '',
    status: 'open',
    affected_travelers_count: 0,
    response_actions: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchItems = async () => {
    try {
      const response = await api.get('/incidents');
      setItems(response.data);
    } catch (err) {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const uniqueTypes = [...new Set(items.map((i) => i.incident_type).filter(Boolean))];

  const filtered = items.filter((item) => {
    if (filters.severity !== 'all' && item.severity !== filters.severity) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.incident_type !== 'all' && item.incident_type !== filters.incident_type) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (item.title || '').toLowerCase().includes(s) ||
        (item.location || '').toLowerCase().includes(s) ||
        (item.country || '').toLowerCase().includes(s) ||
        (item.reported_by || '').toLowerCase().includes(s) ||
        (item.description || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      incident_type: item.incident_type || '',
      severity: item.severity || 'medium',
      location: item.location || '',
      country: item.country || '',
      date_occurred: item.date_occurred ? item.date_occurred.slice(0, 16) : '',
      reported_by: item.reported_by || '',
      status: item.status || 'open',
      affected_travelers_count: item.affected_travelers_count || 0,
      response_actions: item.response_actions || '',
    });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/incidents/${editItem.id}`, formData);
        toast.success('Incident updated');
      } else {
        await api.post('/incidents', formData);
        toast.success('Incident created');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update incident' : 'Failed to create incident');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete incident "${item.title}"?`)) return;
    try {
      await api.delete(`/incidents/${item.id}`);
      toast.success('Incident deleted');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete incident');
    }
  };

  const parseAiOutput = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        if (currentSection) sections.push(currentSection);
        currentSection = { header: trimmed.replace(/\*\*/g, ''), content: [] };
      } else if (trimmed.startsWith('##') || trimmed.startsWith('# ')) {
        if (currentSection) sections.push(currentSection);
        currentSection = { header: trimmed.replace(/^#+\s*/, ''), content: [] };
      } else if (trimmed) {
        if (!currentSection) {
          currentSection = { header: null, content: [] };
        }
        currentSection.content.push(trimmed);
      }
    });
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const analyzeIncident = async (item) => {
    setAiLoading(true);
    setAiOutput(null);
    try {
      const response = await api.post('/ai/analyze-incident', {
        id: item.id,
        title: item.title,
        description: item.description,
        incident_type: item.incident_type,
        severity: item.severity,
        location: item.location,
        country: item.country,
      });
      const text = response.data.analysis || response.data.result || response.data.message || JSON.stringify(response.data, null, 2);
      setAiOutput(text);
    } catch (err) {
      toast.error('AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'affected_travelers_count' ? Number(value) : value }));
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
        <h1>Incident Reports</h1>
        <p>Track and manage security incidents</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search incidents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="form-select"
          value={filters.incident_type}
          onChange={(e) => setFilters((f) => ({ ...f, incident_type: e.target.value }))}
        >
          <option value="all">All Types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="data-table-container">
        <div className="data-table-header">
          <span>{filtered.length} incident{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">No incidents found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Type</th>
                <th>Location / Country</th>
                <th>Date Occurred</th>
                <th>Status</th>
                <th>Affected</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setAiOutput(null); }} style={{ cursor: 'pointer' }}>
                  <td><span className={`badge badge-${item.severity}`}>{item.severity}</span></td>
                  <td>{item.title}</td>
                  <td>{item.incident_type}</td>
                  <td>{[item.location, item.country].filter(Boolean).join(', ')}</td>
                  <td>{formatDate(item.date_occurred)}</td>
                  <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                  <td>{item.affected_travelers_count ?? '—'}</td>
                  <td>{item.reported_by}</td>
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
                  <span className="detail-label">Severity</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.severity}`}>{selectedItem.severity}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Incident Type</span>
                  <span className="detail-value">{selectedItem.incident_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{selectedItem.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date Occurred</span>
                  <span className="detail-value">{formatDate(selectedItem.date_occurred)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reported By</span>
                  <span className="detail-value">{selectedItem.reported_by}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Affected Travelers</span>
                  <span className="detail-value">{selectedItem.affected_travelers_count ?? '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Response Actions</span>
                  <span className="detail-value">{selectedItem.response_actions || '—'}</span>
                </div>
              </div>

              {/* AI Analysis Section */}
              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                  <span>Analyzing incident...</span>
                </div>
              )}

              {aiOutput && (
                <div className="ai-output">
                  <div className="ai-output-header">
                    <span className="ai-icon" role="img" aria-label="AI">&#129302;</span>
                    <span>AI Incident Analysis</span>
                  </div>
                  <div className="ai-output-content">
                    {parseAiOutput(aiOutput).map((section, idx) => (
                      <div key={idx}>
                        {section.header && <h5>{section.header}</h5>}
                        {section.content.map((line, li) => (
                          <p key={li}>{line}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => analyzeIncident(selectedItem)} disabled={aiLoading}>
                AI Analyze Incident
              </button>
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
              <h2>{editItem ? 'Edit Incident' : 'New Incident'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-textarea" name="description" value={formData.description} onChange={handleChange} rows={4} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Incident Type</label>
                    <input className="form-input" name="incident_type" value={formData.incident_type} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select className="form-select" name="severity" value={formData.severity} onChange={handleChange}>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input className="form-input" name="location" value={formData.location} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input className="form-input" name="country" value={formData.country} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date Occurred</label>
                    <input className="form-input" type="datetime-local" name="date_occurred" value={formData.date_occurred} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Reported By</label>
                    <input className="form-input" name="reported_by" value={formData.reported_by} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Affected Travelers Count</label>
                    <input className="form-input" type="number" name="affected_travelers_count" value={formData.affected_travelers_count} onChange={handleChange} min={0} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Response Actions</label>
                  <textarea className="form-textarea" name="response_actions" value={formData.response_actions} onChange={handleChange} rows={3} />
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

export default Incidents;
