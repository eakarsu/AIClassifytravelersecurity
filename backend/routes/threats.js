const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all threats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM threat_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching threats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET threat by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM threat_analyses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Threat not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching threat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create threat
router.post('/', async (req, res) => {
  try {
    const {
      title, threat_type, region, country, threat_level, description,
      potential_impact, affected_areas, mitigation_strategies,
      intelligence_source, confidence_level, valid_from, valid_until,
      status, ai_analysis
    } = req.body;

    const result = await pool.query(
      `INSERT INTO threat_analyses
        (title, threat_type, region, country, threat_level, description,
         potential_impact, affected_areas, mitigation_strategies,
         intelligence_source, confidence_level, valid_from, valid_until,
         status, ai_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [title, threat_type, region, country, threat_level, description,
       potential_impact, affected_areas, mitigation_strategies,
       intelligence_source, confidence_level, valid_from, valid_until,
       status, ai_analysis]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating threat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update threat
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, threat_type, region, country, threat_level, description,
      potential_impact, affected_areas, mitigation_strategies,
      intelligence_source, confidence_level, valid_from, valid_until,
      status, ai_analysis
    } = req.body;

    const result = await pool.query(
      `UPDATE threat_analyses SET
        title=$1, threat_type=$2, region=$3, country=$4, threat_level=$5,
        description=$6, potential_impact=$7, affected_areas=$8,
        mitigation_strategies=$9, intelligence_source=$10, confidence_level=$11,
        valid_from=$12, valid_until=$13, status=$14, ai_analysis=$15
       WHERE id=$16 RETURNING *`,
      [title, threat_type, region, country, threat_level, description,
       potential_impact, affected_areas, mitigation_strategies,
       intelligence_source, confidence_level, valid_from, valid_until,
       status, ai_analysis, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Threat not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating threat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE threat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM threat_analyses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Threat not found' });
    }
    res.json({ message: 'Threat deleted successfully' });
  } catch (error) {
    console.error('Error deleting threat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
