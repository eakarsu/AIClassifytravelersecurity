const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all trips (joined with travelers for traveler name)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, tr.first_name AS traveler_first_name, tr.last_name AS traveler_last_name
       FROM trips t
       LEFT JOIN travelers tr ON t.traveler_id = tr.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET trip by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, tr.first_name AS traveler_first_name, tr.last_name AS traveler_last_name
       FROM trips t
       LEFT JOIN travelers tr ON t.traveler_id = tr.id
       WHERE t.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create trip
router.post('/', async (req, res) => {
  try {
    const {
      traveler_id, destination, country, start_date, end_date, status,
      hotel_name, hotel_address, flight_number, notes, risk_level
    } = req.body;

    const result = await pool.query(
      `INSERT INTO trips
        (traveler_id, destination, country, start_date, end_date, status,
         hotel_name, hotel_address, flight_number, notes, risk_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [traveler_id, destination, country, start_date, end_date, status,
       hotel_name, hotel_address, flight_number, notes, risk_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update trip
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      traveler_id, destination, country, start_date, end_date, status,
      hotel_name, hotel_address, flight_number, notes, risk_level
    } = req.body;

    const result = await pool.query(
      `UPDATE trips SET
        traveler_id=$1, destination=$2, country=$3, start_date=$4, end_date=$5,
        status=$6, hotel_name=$7, hotel_address=$8, flight_number=$9, notes=$10,
        risk_level=$11
       WHERE id=$12 RETURNING *`,
      [traveler_id, destination, country, start_date, end_date, status,
       hotel_name, hotel_address, flight_number, notes, risk_level, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE trip
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM trips WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
