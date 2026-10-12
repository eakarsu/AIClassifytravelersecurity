import React from 'react';

const isReference = (key, value) => /(^id$|_id$|Id$|^user_id$|^created_at$|^updated_at$|file|upload|attachment|image)/i.test(key) || (typeof File !== 'undefined' && value instanceof File);

export function fillEveryField(values, variant = 0, choices = {}) {
  const scenarios = [
    { city: 'Bangkok', country: 'Thailand', event: 'Transit disruption near the central business district', risk: 'medium' },
    { city: 'Nairobi', country: 'Kenya', event: 'Demonstration near the airport access road', risk: 'high' },
    { city: 'Lisbon', country: 'Portugal', event: 'Severe weather affecting rail connections', risk: 'low' },
  ];
  const scenario = scenarios[variant % scenarios.length];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (isReference(key, value)) return [key, value];
    if (choices[key]?.length) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [scenario.event, 'Confirm local conditions before travel']];
    if (value && typeof value === 'object') return [key, value];
    if (typeof value === 'boolean') return [key, value];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, /time|occurred/.test(key) ? 16 : 10)];
    if (/email/.test(key)) return [key, `operations${variant + 1}@example.com`];
    if (/latitude/.test(key)) return [key, [13.7563, -1.2921, 38.7223][variant % 3]];
    if (/longitude/.test(key)) return [key, [100.5018, 36.8219, -9.1393][variant % 3]];
    if (/country/.test(key)) return [key, scenario.country];
    if (/city|destination|region|location/.test(key)) return [key, `${scenario.city}, ${scenario.country}`];
    if (/risk|severity|threat_level/.test(key) && typeof value === 'string' && ['low', 'medium', 'high', 'critical'].includes(value)) return [key, scenario.risk];
    if (/status/.test(key) && value) return [key, value];
    if (/count|score|duration/.test(key) || typeof value === 'number') return [key, [2, 5, 1][variant % 3]];
    if (/source|issued_by|reported_by|assessed_by/.test(key)) return [key, 'Travel security operations desk'];
    if (/type|category/.test(key)) return [key, 'Travel disruption'];
    if (/title|name/.test(key)) return [key, scenario.event];
    if (/recommend|action|response/.test(key)) return [key, 'Verify the latest local advisory, contact affected travelers, and prepare an alternate route.'];
    return [key, `${scenario.event} in ${scenario.city}. This is a planning example; verify time, location, and affected travelers before taking action.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Transit disruption', 'Airport demonstration', 'Severe weather'];
  return <div className="ai-preset-bar"><div><strong>Fill every field</strong><p>Each example fills required and optional fields. Review and edit before generating.</p></div><div className="ai-actions">{labels.map((label, index) => <button type="button" className="btn btn-secondary" key={label} disabled={disabled} onClick={() => onChange(presets ? { ...value, ...Object.fromEntries(Object.entries(presets[index].values).filter(([key]) => !isReference(key, value[key]))) } : fillEveryField(value, index, choices))}>{label}</button>)}</div></div>;
}
