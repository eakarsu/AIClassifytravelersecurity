const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

router.use(authenticateToken);

// Ensure geofence_zones table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS geofence_zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        risk_level VARCHAR(50) DEFAULT 'high',
        polygon JSONB NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS geofence_alerts (
        id SERIAL PRIMARY KEY,
        traveler_id INTEGER,
        zone_id INTEGER REFERENCES geofence_zones(id) ON DELETE CASCADE,
        coordinates JSONB NOT NULL,
        triggered_at TIMESTAMPTZ DEFAULT NOW(),
        acknowledged BOOLEAN DEFAULT FALSE
      )
    `);
  } catch (err) {
    console.error('Failed to create geofence tables:', err.message);
  }
})();

/**
 * Ray-casting algorithm for point-in-polygon check.
 * polygon: array of {lat, lng} objects forming a closed polygon.
 * point: {lat, lng}
 * Returns true if the point is inside the polygon.
 */
function isPointInPolygon(point, polygon) {
  const { lat: py, lng: px } = point;
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    // Check if the horizontal ray from (px, py) crosses edge (xi,yi)-(xj,yj)
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

// ─── POST /api/geofence/zones — define a high-risk geographic zone ─────────────
router.post(
  '/zones',
  [
    body('name').notEmpty().withMessage('name is required').isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('risk_level')
      .optional()
      .isIn(['critical', 'high', 'medium', 'low']).withMessage('risk_level must be critical, high, medium, or low'),
    body('polygon')
      .notEmpty().withMessage('polygon is required')
      .isArray({ min: 3 }).withMessage('polygon must be an array of at least 3 coordinates'),
    body('polygon.*.lat')
      .isFloat({ min: -90, max: 90 }).withMessage('Each polygon point must have a valid lat'),
    body('polygon.*.lng')
      .isFloat({ min: -180, max: 180 }).withMessage('Each polygon point must have a valid lng'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, description, risk_level = 'high', polygon } = req.body;

      const result = await pool.query(
        `INSERT INTO geofence_zones (name, description, risk_level, polygon, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description || null, risk_level, JSON.stringify(polygon), req.user?.id || null]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('Error creating geofence zone:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/geofence/zones — list all active zones ─────────────────────────
router.get('/zones', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM geofence_zones WHERE active = TRUE ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching geofence zones:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/geofence/zones/:id — deactivate a zone ──────────────────────
router.delete('/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE geofence_zones SET active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/geofence/check — check if traveler is in a risk zone ───────────
router.post(
  '/check',
  [
    body('traveler_id').notEmpty().withMessage('traveler_id is required').isInt(),
    body('current_coordinates').notEmpty().withMessage('current_coordinates is required').isObject(),
    body('current_coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('current_coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { traveler_id, current_coordinates } = req.body;
      const point = { lat: current_coordinates.lat, lng: current_coordinates.lng };

      // Fetch all active zones
      const zonesResult = await pool.query(
        'SELECT * FROM geofence_zones WHERE active = TRUE'
      );

      const triggeredZones = [];

      for (const zone of zonesResult.rows) {
        const polygon = typeof zone.polygon === 'string'
          ? JSON.parse(zone.polygon)
          : zone.polygon;

        if (isPointInPolygon(point, polygon)) {
          triggeredZones.push(zone);

          // Log the geofence alert
          await pool.query(
            `INSERT INTO geofence_alerts (traveler_id, zone_id, coordinates)
             VALUES ($1, $2, $3)`,
            [traveler_id, zone.id, JSON.stringify(current_coordinates)]
          );
        }
      }

      const inRiskZone = triggeredZones.length > 0;

      res.json({
        success: true,
        traveler_id,
        coordinates: current_coordinates,
        in_risk_zone: inRiskZone,
        triggered_zones: triggeredZones.map(z => ({
          id: z.id,
          name: z.name,
          risk_level: z.risk_level,
          description: z.description,
        })),
        alert: inRiskZone
          ? {
              message: `ALERT: Traveler #${traveler_id} has entered ${triggeredZones.length} risk zone(s).`,
              zones: triggeredZones.map(z => z.name),
              highest_risk: triggeredZones.reduce((max, z) => {
                const order = { critical: 4, high: 3, medium: 2, low: 1 };
                return (order[z.risk_level] || 0) > (order[max] || 0) ? z.risk_level : max;
              }, 'low'),
            }
          : null,
      });
    } catch (err) {
      console.error('Error checking geofence:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/geofence/alerts — list geofence trigger history ─────────────────
router.get('/alerts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM geofence_alerts');
    const total = parseInt(countResult.rows[0].count) || 0;

    const result = await pool.query(
      `SELECT ga.*, gz.name AS zone_name, gz.risk_level
       FROM geofence_alerts ga
       LEFT JOIN geofence_zones gz ON ga.zone_id = gz.id
       ORDER BY ga.triggered_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
