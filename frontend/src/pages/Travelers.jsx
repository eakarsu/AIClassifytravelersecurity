import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Travelers = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    risk_level: 'all',
  });

  const emptyForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport_number: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    current_location: '',
    status: 'active',
    risk_level: 'low',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchTravelers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/travelers');
      setItems(response.data.travelers || response.data || []);
    } catch (err) {
      toast.error('Failed to fetch travelers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravelers();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.risk_level !== 'all' && item.risk_level !== filters.risk_level) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.first_name || '').toLowerCase().includes(q) ||
        (item.last_name || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q) ||
        (item.nationality || '').toLowerCase().includes(q) ||
        (item.current_location || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDetail = (item) => setSelectedItem(item);
  const closeDetail = () => setSelectedItem(null);

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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/travelers/${editItem._id || editItem.id}`, formData);
        toast.success('Traveler updated successfully');
      } else {
        await api.post('/travelers', formData);
        toast.success('Traveler created successfully');
      }
      closeForm();
      fetchTravelers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save traveler');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.first_name} ${item.last_name}?`)) return;
    try {
      await api.delete(`/travelers/${item._id || item.id}`);
      toast.success('Traveler deleted successfully');
      setSelectedItem(null);
      fetchTravelers();
    } catch (err) {
      toast.error('Failed to delete traveler');
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
        <h2>Travelers</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>
          Add New
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="traveling">Traveling</option>
          <option value="alert">Alert</option>
          <option value="evacuated">Evacuated</option>
          <option value="safe">Safe</option>
        </select>

        <select
          className="form-select"
          value={filters.risk_level}
          onChange={(e) => setFilters((f) => ({ ...f, risk_level: e.target.value }))}
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Search travelers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">No travelers found.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Nationality</th>
              <th>Location</th>
              <th>Status</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id || item.id} onClick={() => openDetail(item)}>
                <td>{item.first_name} {item.last_name}</td>
                <td>{item.email}</td>
                <td>{item.phone}</td>
                <td>{item.nationality}</td>
                <td>{item.current_location}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </td>
                <td>
                  <span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span>
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
              <h3>{selectedItem.first_name} {selectedItem.last_name}</h3>
              <button className="btn btn-secondary" onClick={closeDetail}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">First Name</span>
                  <span className="detail-value">{selectedItem.first_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Name</span>
                  <span className="detail-value">{selectedItem.last_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selectedItem.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{selectedItem.phone || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Passport Number</span>
                  <span className="detail-value">{selectedItem.passport_number || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nationality</span>
                  <span className="detail-value">{selectedItem.nationality || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Emergency Contact</span>
                  <span className="detail-value">{selectedItem.emergency_contact_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Emergency Phone</span>
                  <span className="detail-value">{selectedItem.emergency_contact_phone || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Location</span>
                  <span className="detail-value">{selectedItem.current_location || '—'}</span>
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
                  <span className="detail-label">Risk Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.risk_level}`}>
                      {selectedItem.risk_level}
                    </span>
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
              <h3>{editItem ? 'Edit Traveler' : 'New Traveler'}</h3>
              <button className="btn btn-secondary" onClick={closeForm}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      className="form-input"
                      value={formData.first_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      className="form-input"
                      value={formData.last_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-input"
                      value={formData.phone}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Passport Number</label>
                    <input
                      type="text"
                      name="passport_number"
                      className="form-input"
                      value={formData.passport_number}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nationality</label>
                    <input
                      type="text"
                      name="nationality"
                      className="form-input"
                      value={formData.nationality}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      className="form-input"
                      value={formData.emergency_contact_name}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone</label>
                    <input
                      type="text"
                      name="emergency_contact_phone"
                      className="form-input"
                      value={formData.emergency_contact_phone}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Current Location</label>
                  <input
                    type="text"
                    name="current_location"
                    className="form-input"
                    value={formData.current_location}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleFormChange}
                    >
                      <option value="active">Active</option>
                      <option value="traveling">Traveling</option>
                      <option value="alert">Alert</option>
                      <option value="evacuated">Evacuated</option>
                      <option value="safe">Safe</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Risk Level</label>
                    <select
                      name="risk_level"
                      className="form-select"
                      value={formData.risk_level}
                      onChange={handleFormChange}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
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

export default Travelers;
