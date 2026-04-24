import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const STATUS_OPTIONS = ['upcoming', 'active', 'completed', 'cancelled'];
const RISK_OPTIONS = ['low', 'medium', 'high', 'critical'];

const emptyForm = {
  traveler_id: '',
  destination: '',
  country: '',
  start_date: '',
  end_date: '',
  status: 'upcoming',
  hotel_name: '',
  hotel_address: '',
  flight_number: '',
  notes: '',
  risk_level: 'low',
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
};

const Trips = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', risk_level: 'all' });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trips');
      setItems(response.data);
    } catch (err) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.risk_level !== 'all' && item.risk_level !== filters.risk_level) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (item.destination || '').toLowerCase().includes(q) ||
        (item.country || '').toLowerCase().includes(q) ||
        (item.flight_number || '').toLowerCase().includes(q) ||
        (item.traveler_first_name || '').toLowerCase().includes(q) ||
        (item.traveler_last_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const travelerName = (item) => {
    if (item.traveler_first_name || item.traveler_last_name) {
      return `${item.traveler_first_name || ''} ${item.traveler_last_name || ''}`.trim();
    }
    return item.traveler_id;
  };

  const openAdd = () => {
    setEditItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      traveler_id: item.traveler_id || '',
      destination: item.destination || '',
      country: item.country || '',
      start_date: item.start_date ? item.start_date.substring(0, 10) : '',
      end_date: item.end_date ? item.end_date.substring(0, 10) : '',
      status: item.status || 'upcoming',
      hotel_name: item.hotel_name || '',
      hotel_address: item.hotel_address || '',
      flight_number: item.flight_number || '',
      notes: item.notes || '',
      risk_level: item.risk_level || 'low',
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
      traveler_id: formData.traveler_id ? Number(formData.traveler_id) : null,
    };
    try {
      if (editItem) {
        await api.put(`/trips/${editItem.id}`, payload);
        toast.success('Trip updated successfully');
      } else {
        await api.post('/trips', payload);
        toast.success('Trip created successfully');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update trip' : 'Failed to create trip');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      await api.delete(`/trips/${item.id}`);
      toast.success('Trip deleted successfully');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete trip');
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
        <h1>Trips</h1>
        <button className="btn btn-primary" onClick={openAdd}>Add New</button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search trips..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No trips found</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Country</th>
              <th>Traveler</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Flight</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                <td>{item.destination}</td>
                <td>{item.country}</td>
                <td>{travelerName(item)}</td>
                <td>{formatDate(item.start_date)} - {formatDate(item.end_date)}</td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                <td><span className={`badge badge-${item.risk_level}`}>{item.risk_level}</span></td>
                <td>{item.flight_number}</td>
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
              <h2>{selectedItem.destination}</h2>
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>X</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Traveler</span>
                  <span className="detail-value">{travelerName(selectedItem)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Traveler ID</span>
                  <span className="detail-value">{selectedItem.traveler_id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destination</span>
                  <span className="detail-value">{selectedItem.destination}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country</span>
                  <span className="detail-value">{selectedItem.country}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">{formatDate(selectedItem.start_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">End Date</span>
                  <span className="detail-value">{formatDate(selectedItem.end_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.status}`}>{selectedItem.status}</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Risk Level</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedItem.risk_level}`}>{selectedItem.risk_level}</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hotel Name</span>
                  <span className="detail-value">{selectedItem.hotel_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hotel Address</span>
                  <span className="detail-value">{selectedItem.hotel_address}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Flight Number</span>
                  <span className="detail-value">{selectedItem.flight_number}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{selectedItem.notes}</span>
                </div>
              </div>
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
              <h2>{editItem ? 'Edit Trip' : 'Add New Trip'}</h2>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>X</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Traveler ID</label>
                  <input
                    type="number"
                    name="traveler_id"
                    className="form-input"
                    value={formData.traveler_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Destination</label>
                    <input
                      type="text"
                      name="destination"
                      className="form-input"
                      value={formData.destination}
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
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      className="form-input"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      className="form-input"
                      value={formData.end_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
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
                    <label>Hotel Name</label>
                    <input
                      type="text"
                      name="hotel_name"
                      className="form-input"
                      value={formData.hotel_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Flight Number</label>
                    <input
                      type="text"
                      name="flight_number"
                      className="form-input"
                      value={formData.flight_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Hotel Address</label>
                  <textarea
                    name="hotel_address"
                    className="form-textarea"
                    value={formData.hotel_address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    className="form-textarea"
                    value={formData.notes}
                    onChange={handleChange}
                  />
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

export default Trips;
