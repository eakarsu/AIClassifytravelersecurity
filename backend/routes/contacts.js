const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all contacts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM emergency_contacts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET contact by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM emergency_contacts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create contact
router.post('/', async (req, res) => {
  try {
    const {
      name, organization, role, country, region, phone, email,
      contact_type, available_24h, languages, notes, priority
    } = req.body;

    const result = await pool.query(
      `INSERT INTO emergency_contacts
        (name, organization, role, country, region, phone, email,
         contact_type, available_24h, languages, notes, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [name, organization, role, country, region, phone, email,
       contact_type, available_24h, languages, notes, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, organization, role, country, region, phone, email,
      contact_type, available_24h, languages, notes, priority
    } = req.body;

    const result = await pool.query(
      `UPDATE emergency_contacts SET
        name=$1, organization=$2, role=$3, country=$4, region=$5, phone=$6,
        email=$7, contact_type=$8, available_24h=$9, languages=$10, notes=$11,
        priority=$12
       WHERE id=$13 RETURNING *`,
      [name, organization, role, country, region, phone, email,
       contact_type, available_24h, languages, notes, priority, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM emergency_contacts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
