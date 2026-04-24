import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Zones = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    zone_type: 'all',
    severity: 'all',
    status: 'all',
  });

  const emptyForm = {
    name: '',
    zone_type: 'monitoring',
    country: '',
    region: '',
    center_lat: '',
    center_lng: '',
    radius_km: '',
    description: '',
    alert_message: '',
    severity: 'medium',
    active_travelers: 0,
    status: 'active',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/zones');
      setItems(response.data.zones || response.data || []);
    } catch (err) {
      toast.error('Failed to fetch zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const severities = [...new Set(items.map((z) => z.severity).filter(Boolean))];

  const filteredItems = items.filter((item) => {
    if (filters.zone_type !== 'all' && item.zone_type !== filters.zone_type) return false;
    if (filters.severity !== 'all' && item.severity !== filters.severity) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.region || '').toLowerCase().includes(q) ||
        (item.zone_type || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
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
        await api.put(`/zones/${editItem._id || editItem.id}`, formData);
        toast.success('Zone updated successfully');
      } else {
        await api.post('/zones', formData);
        toast.success('Zone created successfully');
      }
      closeForm();
      fetchZones();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save zone');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await api.delete(`/zones/${item._id || item.id}`);
      toast.success('Zone deleted successfully');
      setSelectedItem(null);
      fetchZones();
    } catch (err) {
      toast.error('Failed to delete zone');
    }
  };

  const formatCoord = (lat, lng) => {
    if (lat == null && lng == null) return '—';
    const latStr = lat != null ? `${Number(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}` : '—';
    const lngStr = lng != null ? `${Number(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}` : '—';
    return `${latStr}, ${lngStr}`;
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
        <h2>Geofencing Zones</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>
          Add New
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.zone_type}
          onChange={(e) => setFilters((f) => ({ ...f, zone_type: e.target.value }))}
        >
          <option value="all">All Types</option>
          <option value="danger">Danger</option>
          <option value="restricted">Restricted</option>
          <option value="safe">Safe</option>
          <option value="monitoring">Monitoring</option>
          <option value="evacuation">Evacuation</option>
        </select>

        <select
          className="form-select"
          value={filters.severity}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
        >
          <option value="all">All Severities</option>
          {severities.map((sev) => (
            <option key={sev} value={sev}>
              {sev}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search zones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">No zones found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Country / Region</th>
              <th>Radius (km)</th>
              <th>Severity</th>
              <th>Active Travelers</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} onClick={() => openDetail(item)}>
                <td>{item.name}</td>
                <td>
                  <span className={`badge badge-${item.zone_type}`}>{item.zone_type}</span>
                </td>
                <td>
                  {item.country || '—'}
                  {item.region ? ` / ${item.region}` : ''}
                </td>
                <td>{item.radius_km ?? '—'}</td>
                <td>
                  <span className={`badge badge-${item.severity}`}>{item.severity}</span>
                </td>
                <td>{item.active_travelers ?? 0}</td>
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
                  <span className="detail-label">Zone Type</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.zone_type}`}>
                      {selectedItem.zone_type}
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
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">{selectedItem.region || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Radius (km)</span>
                  <span className="detail-value">{selectedItem.radius_km ?? '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Coordinates</span>
                  <span className="detail-value">
                    {formatCoord(selectedItem.center_lat, selectedItem.center_lng)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Active Travelers</span>
                  <span className="detail-value">{selectedItem.active_travelers ?? 0}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{selectedItem.description || '—'}</span>
                </div>
                <div className="detail-item detail-full">
                  <span className="detail-label">Alert Message</span>
                  <span className="detail-value">{selectedItem.alert_message || '—'}</span>
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
              <h3>{editItem ? 'Edit Zone' : 'New Zone'}</h3>
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
                    <label>Zone Type</label>
                    <select
                      name="zone_type"
                      className="form-select"
                      value={formData.zone_type}
                      onChange={handleFormChange}
                    >
                      <option value="danger">Danger</option>
                      <option value="restricted">Restricted</option>
                      <option value="safe">Safe</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="evacuation">Evacuation</option>
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

                <div className="form-row">
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
                    <label>Region</label>
                    <input
                      type="text"
                      name="region"
                      className="form-input"
                      value={formData.region}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Center Latitude</label>
                    <input
                      type="number"
                      name="center_lat"
                      className="form-input"
                      value={formData.center_lat}
                      onChange={handleFormChange}
                      step="0.0001"
                    />
                  </div>

                  <div className="form-group">
                    <label>Center Longitude</label>
                    <input
                      type="number"
                      name="center_lng"
                      className="form-input"
                      value={formData.center_lng}
                      onChange={handleFormChange}
                      step="0.0001"
                    />
                  </div>

                  <div className="form-group">
                    <label>Radius (km)</label>
                    <input
                      type="number"
                      name="radius_km"
                      className="form-input"
                      value={formData.radius_km}
                      onChange={handleFormChange}
                      step="0.01"
                      min="0"
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
                  <label>Alert Message</label>
                  <textarea
                    name="alert_message"
                    className="form-textarea"
                    value={formData.alert_message}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Active Travelers</label>
                    <input
                      type="number"
                      name="active_travelers"
                      className="form-input"
                      value={formData.active_travelers}
                      onChange={handleFormChange}
                      min="0"
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
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
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

export default Zones;
