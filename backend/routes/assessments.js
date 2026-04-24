const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all assessments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM risk_assessments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET assessment by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM risk_assessments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create assessment
router.post('/', async (req, res) => {
  try {
    const {
      destination, country, assessment_date, overall_risk, political_risk,
      terrorism_risk, crime_risk, health_risk, natural_disaster_risk,
      infrastructure_risk, risk_score, summary, recommendations, assessed_by,
      ai_assessment
    } = req.body;

    const result = await pool.query(
      `INSERT INTO risk_assessments
        (destination, country, assessment_date, overall_risk, political_risk,
         terrorism_risk, crime_risk, health_risk, natural_disaster_risk,
         infrastructure_risk, risk_score, summary, recommendations, assessed_by,
         ai_assessment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [destination, country, assessment_date, overall_risk, political_risk,
       terrorism_risk, crime_risk, health_risk, natural_disaster_risk,
       infrastructure_risk, risk_score, summary, recommendations, assessed_by,
       ai_assessment]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update assessment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      destination, country, assessment_date, overall_risk, political_risk,
      terrorism_risk, crime_risk, health_risk, natural_disaster_risk,
      infrastructure_risk, risk_score, summary, recommendations, assessed_by,
      ai_assessment
    } = req.body;

    const result = await pool.query(
      `UPDATE risk_assessments SET
        destination=$1, country=$2, assessment_date=$3, overall_risk=$4,
        political_risk=$5, terrorism_risk=$6, crime_risk=$7, health_risk=$8,
        natural_disaster_risk=$9, infrastructure_risk=$10, risk_score=$11,
        summary=$12, recommendations=$13, assessed_by=$14, ai_assessment=$15
       WHERE id=$16 RETURNING *`,
      [destination, country, assessment_date, overall_risk, political_risk,
       terrorism_risk, crime_risk, health_risk, natural_disaster_risk,
       infrastructure_risk, risk_score, summary, recommendations, assessed_by,
       ai_assessment, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE assessment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM risk_assessments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
