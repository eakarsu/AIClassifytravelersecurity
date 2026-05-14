const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

router.use(authenticateToken);

// Ensure sos_alerts table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        traveler_id INTEGER,
        location JSONB NOT NULL,
        situation_description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        notified_contacts JSONB DEFAULT '[]',
        notification_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by INTEGER
      )
    `);
  } catch (err) {
    console.error('Failed to create sos_alerts table:', err.message);
  }
})();

/**
 * Send emergency email notification via nodemailer.
 * Gracefully skipped if SMTP is not configured.
 */
async function sendEmergencyEmail(contacts, traveler, location, situation, sosId) {
  try {
    const nodemailer = require('nodemailer');

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn('[SOS] SMTP not configured — skipping email notifications.');
      return { sent: false, reason: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const locationText = typeof location === 'object'
      ? `Lat: ${location.lat || location.latitude}, Lng: ${location.lng || location.longitude}`
      : String(location);

    const emailAddresses = contacts
      .map(c => c.email)
      .filter(Boolean);

    if (emailAddresses.length === 0) {
      return { sent: false, reason: 'No email addresses found in emergency contacts' };
    }

    const travelerName = traveler
      ? `${traveler.first_name || ''} ${traveler.last_name || ''}`.trim() || `Traveler #${traveler.id}`
      : `Traveler #${contacts[0]?.traveler_id || 'Unknown'}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emailAddresses.join(', '),
      subject: `[URGENT SOS] Emergency Alert - ${travelerName} - Case #${sosId}`,
      html: `
        <h1 style="color: red;">EMERGENCY SOS ALERT</h1>
        <p><strong>Case #:</strong> ${sosId}</p>
        <p><strong>Traveler:</strong> ${travelerName}</p>
        <p><strong>Location:</strong> ${locationText}</p>
        <p><strong>Situation:</strong> ${situation || 'No description provided'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p>This is an automated emergency notification from the Travel Security System.
           Please take immediate action to contact the traveler and/or appropriate authorities.</p>
      `,
    });

    return { sent: true, notified: emailAddresses };
  } catch (err) {
    console.error('[SOS] Email notification error:', err.message);
    return { sent: false, reason: err.message };
  }
}

// ─── POST /api/sos/trigger ─────────────────────────────────────────────────────
router.post(
  '/trigger',
  [
    body('traveler_id').notEmpty().withMessage('traveler_id is required').isInt(),
    body('location').notEmpty().withMessage('location is required'),
    body('situation_description')
      .optional()
      .isString()
      .isLength({ max: 2000 }).withMessage('situation_description must not exceed 2000 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { traveler_id, location, situation_description } = req.body;

      // Fetch traveler info
      let traveler = null;
      try {
        const tResult = await pool.query('SELECT * FROM travelers WHERE id = $1', [traveler_id]);
        traveler = tResult.rows[0] || null;
      } catch (_) {}

      // Fetch emergency contacts for the traveler
      let emergencyContacts = [];
      try {
        const cResult = await pool.query(
          'SELECT * FROM emergency_contacts WHERE traveler_id = $1',
          [traveler_id]
        );
        emergencyContacts = cResult.rows;
      } catch (_) {
        // Table may have different structure — use traveler's own emergency contact fields
        if (traveler?.emergency_contact_email || traveler?.emergency_contact_phone) {
          emergencyContacts = [{
            email: traveler.emergency_contact_email,
            phone: traveler.emergency_contact_phone,
            name: traveler.emergency_contact_name,
          }];
        }
      }

      // Create the critical SOS alert
      const sosResult = await pool.query(
        `INSERT INTO sos_alerts (traveler_id, location, situation_description, status)
         VALUES ($1, $2, $3, 'active') RETURNING *`,
        [traveler_id, JSON.stringify(location), situation_description || null]
      );

      const sosAlert = sosResult.rows[0];

      // Send email notifications (graceful skip if not configured)
      const emailResult = await sendEmergencyEmail(
        emergencyContacts,
        traveler,
        location,
        situation_description,
        sosAlert.id
      );

      // Update SOS record with notification status
      await pool.query(
        `UPDATE sos_alerts SET notified_contacts = $1, notification_error = $2 WHERE id = $3`,
        [
          JSON.stringify(emailResult.notified || []),
          emailResult.sent ? null : emailResult.reason,
          sosAlert.id,
        ]
      );

      res.status(201).json({
        success: true,
        sos_id: sosAlert.id,
        status: 'active',
        traveler_id,
        location,
        situation_description,
        notifications: emailResult,
        created_at: sosAlert.created_at,
        message: 'SOS alert created. Emergency contacts have been notified.',
      });
    } catch (err) {
      console.error('Error triggering SOS:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/sos/active — list all active SOS alerts (admin) ─────────────────
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*,
              t.first_name, t.last_name, t.email AS traveler_email,
              t.phone AS traveler_phone
       FROM sos_alerts sa
       LEFT JOIN travelers t ON sa.traveler_id = t.id
       WHERE sa.status = 'active'
       ORDER BY sa.created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching active SOS alerts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/sos/:id/resolve — mark SOS as resolved ───────────────────────
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE sos_alerts SET status = 'resolved', resolved_at = NOW(), resolved_by = $1
       WHERE id = $2 AND status = 'active' RETURNING *`,
      [req.user?.id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active SOS alert not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
