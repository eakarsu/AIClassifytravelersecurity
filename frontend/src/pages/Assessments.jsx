import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const RISK_LEVELS = ['critical', 'high', 'medium', 'low'];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
};

const riskScoreColor = (score) => {
  if (score > 75) return '#ef4444';
  if (score > 50) return '#f97316';
  if (score > 25) return '#eab308';
  return '#22c55e';
};

const emptyForm = {
  destination: '',
  country: '',
  assessment_date: '',
  overall_risk: 'low',
  political_risk: 'low',
  terrorism_risk: 'low',
  crime_risk: 'low',
  health_risk: 'low',
  natural_disaster_risk: 'low',
  infrastructure_risk: 'low',
  risk_score: 0,
  summary: '',
  recommendations: '',
  assessed_by: '',
};

const Assessments = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ overall_risk: 'all', country: 'all' });
  const [formData, setFormData] = useState(emptyForm);
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assessments');
      setItems(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const countries = [...new Set(items.map((item) => item.country).filter(Boolean))].sort();

  const filtered = items.filter((item) => {
    if (filters.overall_risk !== 'all' && item.overall_risk !== filters.overall_risk) return false;
    if (filters.country !== 'all' && item.country !== filters.country) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.destination || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.assessed_by || '').toLowerCase().includes(q)
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
      destination: item.destination || '',
      country: item.country || '',
      assessment_date: item.assessment_date || '',
      overall_risk: item.overall_risk || 'low',
      political_risk: item.political_risk || 'low',
      terrorism_risk: item.terrorism_risk || 'low',
      crime_risk: item.crime_risk || 'low',
      health_risk: item.health_risk || 'low',
      natural_disaster_risk: item.natural_disaster_risk || 'low',
      infrastructure_risk: item.infrastructure_risk || 'low',
      risk_score: item.risk_score || 0,
      summary: item.summary || '',
      recommendations: item.recommendations || '',
      assessed_by: item.assessed_by || '',
    });
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/assessments/${editItem.id}`, formData);
        toast.success('Assessment updated successfully');
      } else {
        await api.post('/assessments', formData);
        toast.success('Assessment created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update assessment' : 'Failed to create assessment');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete the assessment for "${item.destination}"?`)) return;
    try {
      await api.delete(`/assessments/${item.id}`);
      toast.success('Assessment deleted successfully');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete assessment');
    }
  };

  const handleAiAssess = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiOutput('');
    try {
      const response = await api.post('/ai/assess-risk', {
        name: selectedItem.destination,
        country: selectedItem.country,
        current_alerts: 'Based on current assessment',
      });
      setAiOutput(response.data.assessment || response.data.result || JSON.stringify(response.data, null, 2));
    } catch (err) {
      toast.error('Failed to generate AI risk assessment');
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
        <h1>Risk Assessments</h1>
        <p>Evaluate and manage destination risk assessments</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search assessments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          value={filters.overall_risk}
          onChange={(e) => setFilters((f) => ({ ...f, overall_risk: e.target.value }))}
        >
          <option value="all">All Risk Levels</option>
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.country}
          onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
        >
          <option value="all">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="data-table-container">
        <div className="data-table-header">
          <span>{filtered.length} assessment{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">No assessments found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>Country</th>
                <th>Date</th>
                <th>Overall Risk</th>
                <th>Risk Score</th>
                <th>Political</th>
                <th>Terrorism</th>
                <th>Crime</th>
                <th>Assessed By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setAiOutput(''); }} style={{ cursor: 'pointer' }}>
                  <td>{item.destination}</td>
                  <td>{item.country}</td>
                  <td>{formatDate(item.assessment_date)}</td>
                  <td><span className={`badge badge-${item.overall_risk}`}>{item.overall_risk}</span></td>
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
                    <span style={{ fontSize: '0.8rem', marginLeft: '0.25rem' }}>{item.risk_score}</span>
                  </td>
                  <td><span className={`badge badge-${item.political_risk}`}>{item.political_risk}</span></td>
                  <td><span className={`badge badge-${item.terrorism_risk}`}>{item.terrorism_risk}</span></td>
                  <td><span className={`badge badge-${item.crime_risk}`}>{item.crime_risk}</span></td>
                  <td>{item.assessed_by}</td>
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
              <h2>{selectedItem.destination} - {selectedItem.country}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Destination</span>
                  <span className="detail-value">{selectedItem.destination}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assessment Date</span>
                  <span className="detail-value">{formatDate(selectedItem.assessment_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assessed By</span>
                  <span className="detail-value">{selectedItem.assessed_by}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Overall Risk</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.overall_risk}`}>{selectedItem.overall_risk}</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Score</span>
                  <span className="detail-value">
                    <div className="risk-score-bar" style={{ display: 'inline-block', width: '100px', verticalAlign: 'middle' }}>
                      <div
                        className="risk-score-fill"
                        style={{
                          width: `${selectedItem.risk_score || 0}%`,
                          backgroundColor: riskScoreColor(selectedItem.risk_score || 0),
                        }}
                      ></div>
                    </div>
                    <span style={{ marginLeft: '0.5rem' }}>{selectedItem.risk_score}/100</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Political Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.political_risk}`}>{selectedItem.political_risk}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Terrorism Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.terrorism_risk}`}>{selectedItem.terrorism_risk}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Crime Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.crime_risk}`}>{selectedItem.crime_risk}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Health Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.health_risk}`}>{selectedItem.health_risk}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Natural Disaster Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.natural_disaster_risk}`}>{selectedItem.natural_disaster_risk}</span></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Infrastructure Risk</span>
                  <span className="detail-value"><span className={`badge badge-${selectedItem.infrastructure_risk}`}>{selectedItem.infrastructure_risk}</span></span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Summary</span>
                  <span className="detail-value">{selectedItem.summary}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Recommendations</span>
                  <span className="detail-value">{selectedItem.recommendations}</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-success" onClick={handleAiAssess} disabled={aiLoading}>
                  <span className="ai-icon">&#9733;</span> AI Assess Risk
                </button>
              </div>

              {(aiLoading || aiOutput) && (
                <div className="ai-output">
                  <div className="ai-output-header">
                    <span className="ai-icon">&#9733;</span> AI Risk Assessment
                  </div>
                  <div className="ai-output-content">
                    {aiLoading ? (
                      <div className="ai-loading"><div className="spinner"></div> Assessing...</div>
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
              <h2>{editItem ? 'Edit Assessment' : 'Add New Assessment'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Destination</label>
                    <input className="form-input" value={formData.destination} onChange={(e) => handleFormChange('destination', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input className="form-input" value={formData.country} onChange={(e) => handleFormChange('country', e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assessment Date</label>
                    <input className="form-input" type="date" value={formData.assessment_date} onChange={(e) => handleFormChange('assessment_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Assessed By</label>
                    <input className="form-input" value={formData.assessed_by} onChange={(e) => handleFormChange('assessed_by', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Overall Risk</label>
                    <select className="form-select" value={formData.overall_risk} onChange={(e) => handleFormChange('overall_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Risk Score (0-100)</label>
                    <input className="form-input" type="number" min="0" max="100" value={formData.risk_score} onChange={(e) => handleFormChange('risk_score', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Political Risk</label>
                    <select className="form-select" value={formData.political_risk} onChange={(e) => handleFormChange('political_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Terrorism Risk</label>
                    <select className="form-select" value={formData.terrorism_risk} onChange={(e) => handleFormChange('terrorism_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Crime Risk</label>
                    <select className="form-select" value={formData.crime_risk} onChange={(e) => handleFormChange('crime_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Health Risk</label>
                    <select className="form-select" value={formData.health_risk} onChange={(e) => handleFormChange('health_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Natural Disaster Risk</label>
                    <select className="form-select" value={formData.natural_disaster_risk} onChange={(e) => handleFormChange('natural_disaster_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Infrastructure Risk</label>
                    <select className="form-select" value={formData.infrastructure_risk} onChange={(e) => handleFormChange('infrastructure_risk', e.target.value)}>
                      {RISK_LEVELS.map((level) => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Summary</label>
                  <textarea className="form-textarea" value={formData.summary} onChange={(e) => handleFormChange('summary', e.target.value)} rows={3} />
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

export default Assessments;
