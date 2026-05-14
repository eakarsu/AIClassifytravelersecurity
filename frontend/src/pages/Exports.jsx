import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api';

const Exports = () => {
  const [downloading, setDownloading] = useState(false);

  const downloadRiskReport = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/export/risk-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `risk-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Risk report downloaded');
    } catch (err) {
      toast.error('Download failed: ' + (err.response?.data?.error || err.message));
    }
    setDownloading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📤 Data Exports</h1>
        <p>Download CSV reports for offline analysis or sharing with stakeholders</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h3>📊 Traveler Risk Report</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Joins all travelers with their latest destination risk assessments. Includes traveler demographics, location,
          and the latest political/terrorism/crime/health/disaster/infrastructure risk scores per destination.
        </p>
        <button className="btn btn-primary" onClick={downloadRiskReport} disabled={downloading}>
          {downloading ? 'Generating...' : '⬇️ Download CSV'}
        </button>
      </div>
    </div>
  );
};

export default Exports;
