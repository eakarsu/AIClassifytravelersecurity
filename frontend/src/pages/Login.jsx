import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const demoConfigured = Boolean(demoEmail && demoPassword);

  const completeLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    onLogin(user);
    navigate('/dashboard');
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/demo-login');
      completeLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Demo login is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCredentials = async () => {
    if (demoConfigured) { setEmail(demoEmail); setPassword(demoPassword); setError(''); return; }
    try {
      const res = await fetch('/api/auth/demo-credentials', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data && data.email && data.password) { setEmail(data.email); setPassword(data.password); setError(''); return; }
    } catch {}
    setError('Demo credentials are not configured for this environment.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      completeLogin(response.data);
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span role="img" aria-label="shield">🛡️</span>
          </div>
          <h1>TravelGuard</h1>
          <p>Security Operations Center</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            aria-label="Log in with the configured demo account"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Log in as demo
          </button>
          <button
            type="button"
            onClick={handleFillDemoCredentials}
            disabled={loading}
            aria-label="Fill demo credentials"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Fill demo credentials
          </button>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
