import React, { useState } from 'react';
import RiskClassificationDashboard from '../components/customViews/RiskClassificationDashboard';
import TravelerFlowChart from '../components/customViews/TravelerFlowChart';
import SecondaryScreeningPDF from '../components/customViews/SecondaryScreeningPDF';
import ScreeningRulesEditor from '../components/customViews/ScreeningRulesEditor';

const TABS = [
  { id: 'risk',  label: 'Risk Classification', icon: '🛡️', kind: 'VIZ' },
  { id: 'flow',  label: 'Traveler Flow',       icon: '✈️', kind: 'VIZ' },
  { id: 'pdf',   label: 'Secondary Screening PDF', icon: '📄', kind: 'NON-VIZ' },
  { id: 'rules', label: 'Screening Rules',     icon: '⚙️', kind: 'NON-VIZ' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('risk');

  return (
    <div className="page" data-testid="custom-views-page">
      <div className="page-header">
        <h1>Screening Views</h1>
        <p>Airport traveler security classification — 2 visualizations + 2 operational tools</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            data-testid={`tab-${t.id}`}
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>
            {t.label}
            <span style={{
              marginLeft: 8, padding: '1px 6px', borderRadius: 4,
              background: t.kind === 'VIZ' ? '#3b82f6' : '#a855f7',
              fontSize: 10, color: '#fff', fontWeight: 600,
            }}>{t.kind}</span>
          </button>
        ))}
      </div>

      {tab === 'risk'  && <RiskClassificationDashboard />}
      {tab === 'flow'  && <TravelerFlowChart />}
      {tab === 'pdf'   && <SecondaryScreeningPDF />}
      {tab === 'rules' && <ScreeningRulesEditor />}
    </div>
  );
}
