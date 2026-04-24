const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all alerts with optional filtering
router.get('/', async (req, res) => {
  try {
    const { severity, status, country, category } = req.query;
    let query = 'SELECT * FROM security_alerts WHERE 1=1';
    const params = [];

    if (severity) {
      params.push(severity);
      query += ` AND severity = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (country) {
      params.push(country);
      query += ` AND country = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET alert by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM security_alerts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create alert
router.post('/', async (req, res) => {
  try {
    const {
      title, description, severity, category, region, country, city,
      source, status, affected_travelers, latitude, longitude,
      ai_classification, ai_risk_score
    } = req.body;

    const result = await pool.query(
      `INSERT INTO security_alerts
        (title, description, severity, category, region, country, city,
         source, status, affected_travelers, latitude, longitude,
         ai_classification, ai_risk_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [title, description, severity, category, region, country, city,
       source, status, affected_travelers, latitude, longitude,
       ai_classification, ai_risk_score]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update alert
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, severity, category, region, country, city,
      source, status, affected_travelers, latitude, longitude,
      ai_classification, ai_risk_score
    } = req.body;

    const result = await pool.query(
      `UPDATE security_alerts SET
        title=$1, description=$2, severity=$3, category=$4, region=$5,
        country=$6, city=$7, source=$8, status=$9, affected_travelers=$10,
        latitude=$11, longitude=$12, ai_classification=$13, ai_risk_score=$14,
        updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [title, description, severity, category, region, country, city,
       source, status, affected_travelers, latitude, longitude,
       ai_classification, ai_risk_score, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM security_alerts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
