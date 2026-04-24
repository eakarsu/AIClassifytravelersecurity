const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all destinations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM destinations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET destination by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create destination
router.post('/', async (req, res) => {
  try {
    const {
      name, country, region, risk_level, risk_score, description,
      travel_advisory, health_risks, entry_requirements, local_emergency_number,
      active_alerts, active_travelers, ai_risk_assessment
    } = req.body;

    const result = await pool.query(
      `INSERT INTO destinations
        (name, country, region, risk_level, risk_score, description,
         travel_advisory, health_risks, entry_requirements, local_emergency_number,
         active_alerts, active_travelers, ai_risk_assessment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [name, country, region, risk_level, risk_score, description,
       travel_advisory, health_risks, entry_requirements, local_emergency_number,
       active_alerts, active_travelers, ai_risk_assessment]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update destination
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, country, region, risk_level, risk_score, description,
      travel_advisory, health_risks, entry_requirements, local_emergency_number,
      active_alerts, active_travelers, ai_risk_assessment
    } = req.body;

    const result = await pool.query(
      `UPDATE destinations SET
        name=$1, country=$2, region=$3, risk_level=$4, risk_score=$5,
        description=$6, travel_advisory=$7, health_risks=$8, entry_requirements=$9,
        local_emergency_number=$10, active_alerts=$11, active_travelers=$12,
        ai_risk_assessment=$13
       WHERE id=$14 RETURNING *`,
      [name, country, region, risk_level, risk_score, description,
       travel_advisory, health_risks, entry_requirements, local_emergency_number,
       active_alerts, active_travelers, ai_risk_assessment, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE destination
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM destinations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    res.json({ message: 'Destination deleted successfully' });
  } catch (error) {
    console.error('Error deleting destination:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
