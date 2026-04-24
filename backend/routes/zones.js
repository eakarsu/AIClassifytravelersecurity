const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all zones
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM geofencing_zones ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET zone by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM geofencing_zones WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create zone
router.post('/', async (req, res) => {
  try {
    const {
      name, zone_type, country, region, center_lat, center_lng, radius_km,
      description, alert_message, severity, active_travelers, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO geofencing_zones
        (name, zone_type, country, region, center_lat, center_lng, radius_km,
         description, alert_message, severity, active_travelers, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [name, zone_type, country, region, center_lat, center_lng, radius_km,
       description, alert_message, severity, active_travelers, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update zone
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, zone_type, country, region, center_lat, center_lng, radius_km,
      description, alert_message, severity, active_travelers, status
    } = req.body;

    const result = await pool.query(
      `UPDATE geofencing_zones SET
        name=$1, zone_type=$2, country=$3, region=$4, center_lat=$5,
        center_lng=$6, radius_km=$7, description=$8, alert_message=$9,
        severity=$10, active_travelers=$11, status=$12
       WHERE id=$13 RETURNING *`,
      [name, zone_type, country, region, center_lat, center_lng, radius_km,
       description, alert_message, severity, active_travelers, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE zone
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM geofencing_zones WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
