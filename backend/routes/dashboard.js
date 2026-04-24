const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Run all queries in parallel for performance
    const [
      alertCounts,
      travelerCounts,
      tripCounts,
      incidentCounts,
      destinationCounts,
      recentAlerts,
      recentIncidents,
      alertsBySeverity,
      alertsByRegion,
      travelersByStatus
    ] = await Promise.all([
      // Alert statistics
      pool.query(`
        SELECT
          COUNT(*) AS total_alerts,
          COUNT(*) FILTER (WHERE severity = 'critical') AS critical_alerts,
          COUNT(*) FILTER (WHERE status = 'active') AS active_alerts
        FROM security_alerts
      `),
      // Traveler statistics
      pool.query(`
        SELECT
          COUNT(*) AS total_travelers,
          COUNT(*) FILTER (WHERE risk_level IN ('high','critical')) AS travelers_at_risk,
          COUNT(*) FILTER (WHERE status = 'traveling') AS travelers_traveling
        FROM travelers
      `),
      // Trip statistics
      pool.query(`
        SELECT
          COUNT(*) AS total_trips,
          COUNT(*) FILTER (WHERE status = 'active') AS active_trips
        FROM trips
      `),
      // Incident statistics
      pool.query(`
        SELECT
          COUNT(*) AS total_incidents,
          COUNT(*) FILTER (WHERE status = 'open') AS open_incidents
        FROM incident_reports
      `),
      // Destination statistics
      pool.query(`
        SELECT
          COUNT(*) AS total_destinations,
          COUNT(*) FILTER (WHERE risk_level IN ('high','critical')) AS high_risk_destinations
        FROM destinations
      `),
      // Recent alerts (last 5)
      pool.query(`
        SELECT id, title, severity, category, region, country, status, created_at
        FROM security_alerts
        ORDER BY created_at DESC
        LIMIT 5
      `),
      // Recent incidents (last 5)
      pool.query(`
        SELECT id, title, incident_type, severity, location, country, status, date_reported
        FROM incident_reports
        ORDER BY date_reported DESC
        LIMIT 5
      `),
      // Alerts by severity
      pool.query(`
        SELECT severity, COUNT(*) AS count
        FROM security_alerts
        GROUP BY severity
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `),
      // Alerts by region
      pool.query(`
        SELECT region, COUNT(*) AS count
        FROM security_alerts
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY count DESC
      `),
      // Travelers by status
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM travelers
        GROUP BY status
        ORDER BY count DESC
      `)
    ]);

    const alerts = alertCounts.rows[0];
    const travelers = travelerCounts.rows[0];
    const trips = tripCounts.rows[0];
    const incidents = incidentCounts.rows[0];
    const destinations = destinationCounts.rows[0];

    res.json({
      total_alerts: parseInt(alerts.total_alerts),
      critical_alerts: parseInt(alerts.critical_alerts),
      active_alerts: parseInt(alerts.active_alerts),
      total_travelers: parseInt(travelers.total_travelers),
      travelers_at_risk: parseInt(travelers.travelers_at_risk),
      travelers_traveling: parseInt(travelers.travelers_traveling),
      total_trips: parseInt(trips.total_trips),
      active_trips: parseInt(trips.active_trips),
      total_incidents: parseInt(incidents.total_incidents),
      open_incidents: parseInt(incidents.open_incidents),
      total_destinations: parseInt(destinations.total_destinations),
      high_risk_destinations: parseInt(destinations.high_risk_destinations),
      recent_alerts: recentAlerts.rows,
      recent_incidents: recentIncidents.rows,
      alerts_by_severity: alertsBySeverity.rows,
      alerts_by_region: alertsByRegion.rows,
      travelers_by_status: travelersByStatus.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
