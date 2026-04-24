const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all templates
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM communication_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET template by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM communication_templates WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create template
router.post('/', async (req, res) => {
  try {
    const {
      name, category, subject, body, severity, channels, language,
      placeholders, usage_count, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO communication_templates
        (name, category, subject, body, severity, channels, language,
         placeholders, usage_count, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [name, category, subject, body, severity, channels, language,
       placeholders, usage_count, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, subject, body, severity, channels, language,
      placeholders, usage_count, status
    } = req.body;

    const result = await pool.query(
      `UPDATE communication_templates SET
        name=$1, category=$2, subject=$3, body=$4, severity=$5, channels=$6,
        language=$7, placeholders=$8, usage_count=$9, status=$10
       WHERE id=$11 RETURNING *`,
      [name, category, subject, body, severity, channels, language,
       placeholders, usage_count, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM communication_templates WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
