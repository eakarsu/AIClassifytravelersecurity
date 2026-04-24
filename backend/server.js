const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { initDB } = require('./db/init');

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

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
