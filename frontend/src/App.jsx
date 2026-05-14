import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Travelers from './pages/Travelers';
import Trips from './pages/Trips';
import Destinations from './pages/Destinations';
import Incidents from './pages/Incidents';
import Contacts from './pages/Contacts';
import Advisories from './pages/Advisories';
import Assessments from './pages/Assessments';
import Threats from './pages/Threats';
import Templates from './pages/Templates';
import Zones from './pages/Zones';
import RealTimeThreat from './pages/RealTimeThreat';
import EvacuationPlanner from './pages/EvacuationPlanner';
import MedicalRisk from './pages/MedicalRisk';
import CyberSecurity from './pages/CyberSecurity';
import ItineraryRiskScore from './pages/ItineraryRiskScore';
import Geofence from './pages/Geofence';
import SOS from './pages/SOS';
import Exports from './pages/Exports';
import Notifications from './pages/Notifications';
import Webhooks from './pages/Webhooks';

const navItems = [
  { section: 'Overview' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { section: 'Monitoring' },
  { path: '/alerts', label: 'Security Alerts', icon: '🚨', badgeKey: 'critical_alerts' },
  { path: '/incidents', label: 'Incident Reports', icon: '📋', badgeKey: 'open_incidents' },
  { path: '/threats', label: 'Threat Analysis', icon: '⚡' },
  { section: 'Operations' },
  { path: '/travelers', label: 'Travelers', icon: '👥' },
  { path: '/trips', label: 'Trips', icon: '✈️' },
  { path: '/destinations', label: 'Destinations', icon: '🌍' },
  { section: 'Intelligence' },
  { path: '/advisories', label: 'Travel Advisories', icon: '📢' },
  { path: '/assessments', label: 'Risk Assessments', icon: '📈' },
  { section: 'Response' },
  { path: '/contacts', label: 'Emergency Contacts', icon: '📞' },
  { path: '/templates', label: 'Comm Templates', icon: '📨' },
  { path: '/zones', label: 'Geofencing Zones', icon: '📍' },
  { path: '/sos', label: 'SOS Center', icon: '🚨' },
  { path: '/geofence', label: 'Geofence Triggers', icon: '🛰️' },
  { section: 'AI Tools' },
  { path: '/real-time-threat', label: 'Real-Time Threat', icon: '⚡' },
  { path: '/evacuation-planner', label: 'Evacuation Planner', icon: '🗺️' },
  { path: '/medical-risk', label: 'Medical Risk', icon: '🩺' },
  { path: '/cyber-security', label: 'Cyber Security', icon: '🔐' },
  { path: '/itinerary-risk-score', label: 'Itinerary Risk Score', icon: '📈' },
  { section: 'Reports' },
  { path: '/exports', label: 'Data Exports', icon: '📤' },
  { section: 'System' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/webhooks', label: 'Webhooks', icon: '🪝' },
];

function App() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  if (location.pathname === '/login') {
    return (
      <>
        <Login onLogin={(userData) => setUser(userData)} />
        <ToastContainer theme="dark" position="top-right" />
      </>
    );
  }

  const currentPage = navItems.find(item => item.path && location.pathname.startsWith(item.path));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🛡️</div>
            <div>
              <h1>TravelGuard</h1>
              <p>Security Operations Center</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              return <div key={i} className="nav-section-title">{item.section}</div>;
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badgeKey && stats[item.badgeKey] > 0 && (
                  <span className="nav-badge">{stats[item.badgeKey]}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <h2>{currentPage?.label || 'Dashboard'}</h2>
          </div>
          <div className="top-bar-right">
            <div className="user-menu" onClick={handleLogout}>
              <div className="user-avatar">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="user-name">{user?.name || 'User'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Logout</span>
            </div>
          </div>
        </div>

        <div className="page-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard onStatsLoad={setStats} />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/travelers" element={<Travelers />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/advisories" element={<Advisories />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/real-time-threat" element={<RealTimeThreat />} />
            <Route path="/evacuation-planner" element={<EvacuationPlanner />} />
            <Route path="/medical-risk" element={<MedicalRisk />} />
            <Route path="/cyber-security" element={<CyberSecurity />} />
            <Route path="/itinerary-risk-score" element={<ItineraryRiskScore />} />
            <Route path="/geofence" element={<Geofence />} />
            <Route path="/sos" element={<SOS />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>

      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
