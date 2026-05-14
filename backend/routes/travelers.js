const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all travelers (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM travelers');
    const total = parseInt(countResult.rows[0].count) || 0;

    const result = await pool.query(
      'SELECT * FROM travelers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
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
    console.error('Error fetching travelers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET traveler by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM travelers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Traveler not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching traveler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create traveler
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, passport_number, nationality,
      emergency_contact_name, emergency_contact_phone, current_location,
      status, risk_level
    } = req.body;

    const result = await pool.query(
      `INSERT INTO travelers
        (first_name, last_name, email, phone, passport_number, nationality,
         emergency_contact_name, emergency_contact_phone, current_location,
         status, risk_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [first_name, last_name, email, phone, passport_number, nationality,
       emergency_contact_name, emergency_contact_phone, current_location,
       status, risk_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating traveler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update traveler
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, passport_number, nationality,
      emergency_contact_name, emergency_contact_phone, current_location,
      status, risk_level
    } = req.body;

    const result = await pool.query(
      `UPDATE travelers SET
        first_name=$1, last_name=$2, email=$3, phone=$4, passport_number=$5,
        nationality=$6, emergency_contact_name=$7, emergency_contact_phone=$8,
        current_location=$9, status=$10, risk_level=$11
       WHERE id=$12 RETURNING *`,
      [first_name, last_name, email, phone, passport_number, nationality,
       emergency_contact_name, emergency_contact_phone, current_location,
       status, risk_level, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Traveler not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating traveler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE traveler
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM travelers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Traveler not found' });
    }
    res.json({ message: 'Traveler deleted successfully' });
  } catch (error) {
    console.error('Error deleting traveler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
