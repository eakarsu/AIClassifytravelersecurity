const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
if (!process.env.PSEUDONYMIZATION_KEY || process.env.PSEUDONYMIZATION_KEY.length < 32) throw new Error('PSEUDONYMIZATION_KEY must be at least 32 characters');

const authRoutes = require('./routes/auth');
const alertsRoutes = require('./routes/alerts');
const travelersRoutes = require('./routes/travelers');
const tripsRoutes = require('./routes/trips');
const destinationsRoutes = require('./routes/destinations');
const incidentsRoutes = require('./routes/incidents');
const contactsRoutes = require('./routes/contacts');
const advisoriesRoutes = require('./routes/advisories');
const assessmentsRoutes = require('./routes/assessments');
const threatsRoutes = require('./routes/threats');
const templatesRoutes = require('./routes/templates');
const zonesRoutes = require('./routes/zones');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');

// New routes
const aiNewRoutes = require('./routes/aiNew');
const geofenceRoutes = require('./routes/geofence');
const sosRoutes = require('./routes/sos');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Existing routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/travelers', travelersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/advisories', advisoriesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/threats', threatsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// New AI endpoints (real-time threat, evacuation, medical risk, cyber security)
app.use('/api/ai', aiNewRoutes);

// Geofence system
app.use('/api/geofence', geofenceRoutes);

// SOS emergency system
app.use('/api/sos', sosRoutes);

// Export routes
app.use('/api/export', exportRoutes);

// Audit-recommended additions (notifications, webhooks)
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/traveler-watchlist-correlation', require('./routes/travelerWatchlistCorrelation'));
app.use('/api/governed-screening', require('./routes/governedScreening'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/duty-of-care', require('./routes/dutyOfCareAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/country-briefing-rag', require('./routes/countryBriefingRag')); // apply pass 6 — audit custom suggestion

app.use('/api/geofence-stream', require('./routes/geofenceStream')); // apply pass 6 — audit custom suggestion

app.use('/api/corporate-travel-white-label', require('./routes/corporateTravelWhiteLabel')); // apply pass 6 — audit custom suggestion

app.use('/api/custom-views', require('./routes/customViews')); // Custom Views: airport traveler security classification (4 endpoints)
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
