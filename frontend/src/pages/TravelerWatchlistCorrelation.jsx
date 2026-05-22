import React, { useEffect, useState } from 'react';

export default function TravelerWatchlistCorrelation() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/traveler-watchlist-correlation').then((res) => res.json()).then(setData).catch(() => setData(null));
  }, []);
  return (
    <div className="page">
      <h1>Traveler Watchlist Correlation</h1>
      <p>Correlate itinerary, identity, and zone signals before traveler security escalation.</p>
      <div className="stats-grid">
        {data && Object.entries(data.summary).map(([key, value]) => <div className="stat-card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></div>)}
      </div>
      <div className="card">
        {(data?.matches || []).map((item) => <div key={item.traveler} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><strong>{item.traveler}</strong><div>{item.itinerary} - {item.signal} - {item.confidence}% - {item.action}</div></div>)}
      </div>
    </div>
  );
}
