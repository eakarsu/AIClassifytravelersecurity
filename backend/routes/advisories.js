const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all advisories
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM travel_advisories ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching advisories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET advisory by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM travel_advisories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advisory not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching advisory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create advisory
router.post('/', async (req, res) => {
  try {
    const {
      title, country, region, advisory_level, issued_by, issued_date,
      expiry_date, description, key_risks, recommendations, status, ai_summary
    } = req.body;

    const result = await pool.query(
      `INSERT INTO travel_advisories
        (title, country, region, advisory_level, issued_by, issued_date,
         expiry_date, description, key_risks, recommendations, status, ai_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title, country, region, advisory_level, issued_by, issued_date,
       expiry_date, description, key_risks, recommendations, status, ai_summary]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating advisory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update advisory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, country, region, advisory_level, issued_by, issued_date,
      expiry_date, description, key_risks, recommendations, status, ai_summary
    } = req.body;

    const result = await pool.query(
      `UPDATE travel_advisories SET
        title=$1, country=$2, region=$3, advisory_level=$4, issued_by=$5,
        issued_date=$6, expiry_date=$7, description=$8, key_risks=$9,
        recommendations=$10, status=$11, ai_summary=$12
       WHERE id=$13 RETURNING *`,
      [title, country, region, advisory_level, issued_by, issued_date,
       expiry_date, description, key_risks, recommendations, status, ai_summary, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advisory not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating advisory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE advisory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM travel_advisories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Advisory not found' });
    }
    res.json({ message: 'Advisory deleted successfully' });
  } catch (error) {
    console.error('Error deleting advisory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
