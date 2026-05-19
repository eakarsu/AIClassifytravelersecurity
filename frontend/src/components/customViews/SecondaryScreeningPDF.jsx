import React, { useState } from 'react';
import api from '../../api';

export default function SecondaryScreeningPDF() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [paxId, setPaxId] = useState('PAX-1005');
  const [paxName, setPaxName] = useState('R. Hassan');
  const [origin, setOrigin] = useState('DXB');
  const [destination, setDestination] = useState('ORD');

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/custom-views/secondary-screening-pdf', {
        traveler: { id: paxId, name: paxName, origin, destination },
      });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed');
    }
    setLoading(false);
  };

  const downloadPDF = () => {
    if (!data?.data) return;
    // Minimal hand-rolled PDF generator (no extra npm dep). Produces a single-page PDF.
    const d = data.data;
    const lines = [];
    lines.push(d.title || 'Secondary Screening Report');
    lines.push('');
    lines.push(`Traveler: ${d.traveler?.name || ''} (${d.traveler?.id || ''})`);
    lines.push(`Route: ${d.traveler?.origin || ''} -> ${d.traveler?.destination || ''}`);
    lines.push(`Generated: ${d.generated_at || new Date().toISOString()}`);
    lines.push('');
    (d.sections || []).forEach((s) => {
      lines.push(s.heading || '');
      String(s.body || '').split('\n').forEach((b) => lines.push('  ' + b));
      lines.push('');
    });
    lines.push(d.footer || '');

    // Build a tiny PDF with one Helvetica page.
    const esc = (str) => String(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    let stream = 'BT /F1 11 Tf 50 760 Td 14 TL\n';
    lines.forEach((ln, i) => {
      stream += `(${esc(ln)}) Tj T*\n`;
      // soft page-overflow guard
      if (i > 60) return;
    });
    stream += 'ET';
    const streamLen = stream.length;

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((o, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach((o) => {
      pdf += String(o).padStart(10, '0') + ' 00000 n \n';
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secondary-screening-${d.traveler?.id || 'report'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <h2 style={{ marginTop: 0 }}>Secondary Screening Report (PDF)</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Passenger ID</label>
          <input className="form-input" value={paxId} onChange={(e) => setPaxId(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Name</label>
          <input className="form-input" value={paxName} onChange={(e) => setPaxName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Origin</label>
          <input className="form-input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Destination</label>
          <input className="form-input" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Synthesizing…' : 'Generate Report'}
        </button>
        <button className="btn btn-secondary" onClick={downloadPDF} disabled={!data?.data}>
          Download PDF
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {data?.data && (
        <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, fontSize: 13 }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 12 }}>
            <strong style={{ fontSize: 16 }}>{data.data.title}</strong>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Generated: {data.data.generated_at}</div>
          </div>
          {(data.data.sections || []).map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: '#3b82f6' }}>{s.heading}</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0', color: '#cbd5e1', fontFamily: 'inherit' }}>{s.body}</pre>
            </div>
          ))}
          {data.data.footer && (
            <div style={{ borderTop: '1px solid #334155', paddingTop: 8, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              {data.data.footer}
            </div>
          )}
        </div>
      )}

      {data && <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>source: {data.source}</div>}
    </div>
  );
}
