const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all incidents (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM incident_reports');
    const total = parseInt(countResult.rows[0].count) || 0;

    const result = await pool.query(
      'SELECT * FROM incident_reports ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET incident by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM incident_reports WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create incident
router.post('/', async (req, res) => {
  try {
    const {
      title, description, incident_type, severity, location, country,
      date_occurred, reported_by, status, affected_travelers_count,
      response_actions, ai_analysis
    } = req.body;

    const result = await pool.query(
      `INSERT INTO incident_reports
        (title, description, incident_type, severity, location, country,
         date_occurred, reported_by, status, affected_travelers_count,
         response_actions, ai_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title, description, incident_type, severity, location, country,
       date_occurred, reported_by, status, affected_travelers_count,
       response_actions, ai_analysis]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update incident
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, incident_type, severity, location, country,
      date_occurred, reported_by, status, affected_travelers_count,
      response_actions, ai_analysis
    } = req.body;

    const result = await pool.query(
      `UPDATE incident_reports SET
        title=$1, description=$2, incident_type=$3, severity=$4, location=$5,
        country=$6, date_occurred=$7, reported_by=$8, status=$9,
        affected_travelers_count=$10, response_actions=$11, ai_analysis=$12
       WHERE id=$13 RETURNING *`,
      [title, description, incident_type, severity, location, country,
       date_occurred, reported_by, status, affected_travelers_count,
       response_actions, ai_analysis, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE incident
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM incident_reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json({ message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
