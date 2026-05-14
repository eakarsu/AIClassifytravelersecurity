const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ─── GET /api/export/risk-report ──────────────────────────────────────────────
// CSV export of traveler risk assessments
router.get('/risk-report', async (req, res) => {
  try {
    // Join travelers with their latest risk assessments
    const result = await pool.query(`
      SELECT
        t.id AS traveler_id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.nationality,
        t.current_location,
        t.status AS traveler_status,
        t.risk_level AS traveler_risk_level,
        ra.destination,
        ra.country AS assessment_country,
        ra.overall_risk,
        ra.risk_score,
        ra.political_risk,
        ra.terrorism_risk,
        ra.crime_risk,
        ra.health_risk,
        ra.natural_disaster_risk,
        ra.infrastructure_risk,
        ra.summary,
        ra.assessed_by,
        ra.created_at AS assessment_date
      FROM travelers t
      LEFT JOIN (
        SELECT DISTINCT ON (destination) *
        FROM risk_assessments
        ORDER BY destination, created_at DESC
      ) ra ON LOWER(t.current_location) LIKE LOWER('%' || ra.destination || '%')
         OR LOWER(ra.destination) LIKE LOWER('%' || t.current_location || '%')
      ORDER BY t.last_name, t.first_name
    `);

    const rows = result.rows;

    // Build CSV
    const headers = [
      'Traveler ID', 'First Name', 'Last Name', 'Email', 'Phone',
      'Nationality', 'Current Location', 'Traveler Status', 'Traveler Risk Level',
      'Assessment Destination', 'Assessment Country', 'Overall Risk', 'Risk Score',
      'Political Risk', 'Terrorism Risk', 'Crime Risk', 'Health Risk',
      'Natural Disaster Risk', 'Infrastructure Risk', 'Summary', 'Assessed By', 'Assessment Date'
    ];

    function escapeCsv(value) {
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }

    const csvLines = [
      headers.join(','),
      ...rows.map(row => [
        row.traveler_id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.nationality,
        row.current_location,
        row.traveler_status,
        row.traveler_risk_level,
        row.destination,
        row.assessment_country,
        row.overall_risk,
        row.risk_score,
        row.political_risk,
        row.terrorism_risk,
        row.crime_risk,
        row.health_risk,
        row.natural_disaster_risk,
        row.infrastructure_risk,
        row.summary,
        row.assessed_by,
        row.assessment_date,
      ].map(escapeCsv).join(','))
    ];

    const csv = csvLines.join('\n');
    const filename = `risk-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error generating risk report CSV:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
