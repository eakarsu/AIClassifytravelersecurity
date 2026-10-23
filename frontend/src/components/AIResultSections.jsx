import React from 'react';
// Renders AI JSON as readable labelled sections, preserving false / 0 / empty values.
export default function AIResultSections({ result }) {
  if (!result) return null;
  const sections = result.sections || {};
  return (
    <div>
      {result.aiGenerated === false && <p>Deterministic fallback (no AI provider key configured)</p>}
      {result.disclaimer && <p>{result.disclaimer}</p>}
      <dl>
        {Object.entries(sections).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value === null || value === undefined ? '' : Array.isArray(value) ? (value.length ? value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : '(empty)') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
