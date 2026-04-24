import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const statCards = [
  { key: 'total_alerts', label: 'Total Alerts', icon: '🔔', iconBg: 'rgba(239,68,68,0.15)', route: '/alerts' },
  { key: 'critical_alerts', label: 'Critical Alerts', icon: '🚨', iconBg: 'rgba(239,68,68,0.25)', route: '/alerts' },
  { key: 'active_alerts', label: 'Active Alerts', icon: '⚡', iconBg: 'rgba(249,115,22,0.15)', route: '/alerts' },
  { key: 'total_travelers', label: 'Total Travelers', icon: '👥', iconBg: 'rgba(59,130,246,0.15)', route: '/travelers' },
  { key: 'travelers_at_risk', label: 'Travelers at Risk', icon: '⚠️', iconBg: 'rgba(234,179,8,0.15)', route: '/travelers' },
  { key: 'active_trips', label: 'Active Trips', icon: '✈️', iconBg: 'rgba(34,197,94,0.15)', route: '/travelers' },
  { key: 'open_incidents', label: 'Open Incidents', icon: '📋', iconBg: 'rgba(168,85,247,0.15)', route: '/incidents' },
  { key: 'high_risk_destinations', label: 'High Risk Destinations', icon: '🌍', iconBg: 'rgba(239,68,68,0.15)', route: '/destinations' },
];

const Dashboard = ({ onStatsLoad }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
        if (onStatsLoad) {
          onStatsLoad(response.data);
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [onStatsLoad]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="loading-container">
        <p>Failed to load dashboard data.</p>
      </div>
    );
  }

  const alertsBySeverity = stats.alerts_by_severity || [];
  const alertsByRegion = stats.alerts_by_region || [];

  const maxSeverityCount = Math.max(...alertsBySeverity.map(s => parseInt(s.count)), 1);
  const maxRegionCount = Math.max(...alertsByRegion.map(r => parseInt(r.count)), 1);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Security Operations Overview</p>
      </div>

      <div className="dashboard-grid">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="stat-card"
            onClick={() => navigate(card.route)}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon" style={{ background: card.iconBg }}>
              <span role="img" aria-label={card.label}>{card.icon}</span>
            </div>
            <div className="stat-info">
              <h3>{stats[card.key] ?? 0}</h3>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section">
          <h2>Recent Alerts</h2>
          <div className="recent-list">
            {(stats.recent_alerts || []).slice(0, 5).map((alert, index) => (
              <div key={alert.id || index} className="recent-item">
                <span className={`badge badge-${alert.severity}`}>
                  {alert.severity}
                </span>
                <span className="recent-item-title">{alert.title}</span>
              </div>
            ))}
            {(!stats.recent_alerts || stats.recent_alerts.length === 0) && (
              <p className="no-data">No recent alerts</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Recent Incidents</h2>
          <div className="recent-list">
            {(stats.recent_incidents || []).slice(0, 5).map((incident, index) => (
              <div key={incident.id || index} className="recent-item">
                <span className={`badge badge-${incident.severity}`}>
                  {incident.severity}
                </span>
                <span className="recent-item-title">{incident.title}</span>
              </div>
            ))}
            {(!stats.recent_incidents || stats.recent_incidents.length === 0) && (
              <p className="no-data">No recent incidents</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section">
          <h2>Alerts by Severity</h2>
          <div className="chart-bars">
            {alertsBySeverity.map((item) => (
              <div key={item.severity} className="chart-bar">
                <span className="chart-bar-label">{item.severity}</span>
                <div className="chart-bar-track" style={{flex:1,height:24,background:'var(--border-color)',borderRadius:4,overflow:'hidden'}}>
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(parseInt(item.count) / maxSeverityCount) * 100}%`,
                      backgroundColor: SEVERITY_COLORS[item.severity] || '#6b7280',
                    }}
                  ></div>
                </div>
                <span className="chart-bar-value">{item.count}</span>
              </div>
            ))}
            {alertsBySeverity.length === 0 && (
              <p className="no-data">No severity data available</p>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Alerts by Region</h2>
          <div className="chart-bars">
            {alertsByRegion.map((item) => (
              <div key={item.region} className="chart-bar">
                <span className="chart-bar-label">{item.region}</span>
                <div className="chart-bar-track" style={{flex:1,height:24,background:'var(--border-color)',borderRadius:4,overflow:'hidden'}}>
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: `${(parseInt(item.count) / maxRegionCount) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  ></div>
                </div>
                <span className="chart-bar-value">{item.count}</span>
              </div>
            ))}
            {alertsByRegion.length === 0 && (
              <p className="no-data">No region data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
