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

// New routes
const aiNewRoutes = require('./routes/aiNew');
const geofenceRoutes = require('./routes/geofence');
const sosRoutes = require('./routes/sos');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await initDB();
    
app.use('/api/duty-of-care', require('./routes/dutyOfCareAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/country-briefing-rag', require('./routes/countryBriefingRag')); // apply pass 6 — audit custom suggestion

app.use('/api/geofence-stream', require('./routes/geofenceStream')); // apply pass 6 — audit custom suggestion

app.use('/api/corporate-travel-white-label', require('./routes/corporateTravelWhiteLabel')); // apply pass 6 — audit custom suggestion

app.use('/api/custom-views', require('./routes/customViews')); // Custom Views: airport traveler security classification (4 endpoints)
app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-ainew-js-scaffold-but-0-mounted-chat-style-ai-endp', require('./routes/gap_ainew_js_scaffold_but_0_mounted_chat_style_ai_endp'));
app.use('/api/gap-no-ai-ingest-of-news-intel-feeds-to-auto-update-ad', require('./routes/gap_no_ai_ingest_of_news_intel_feeds_to_auto_update_ad'));
app.use('/api/gap-no-ai-itinerary-risk-scoring-engine-behind-ui-page', require('./routes/gap_no_ai_itinerary_risk_scoring_engine_behind_ui_page'));
app.use('/api/gap-no-ai-geofence-anomaly-detection-wired-to-traveler', require('./routes/gap_no_ai_geofence_anomaly_detection_wired_to_traveler'));
app.use('/api/gap-no-ai-medical-risk-assessment-behind-ui-page', require('./routes/gap_no_ai_medical_risk_assessment_behind_ui_page'));
app.use('/api/gap-notification-routes-exist-but-no-sms-push-delivery', require('./routes/gap_notification_routes_exist_but_no_sms_push_delivery'));
app.use('/api/gap-no-direct-hr-travel-booking-api-client-concur-egen', require('./routes/gap_no_direct_hr_travel_booking_api_client_concur_egen'));
app.use('/api/gap-no-mobile-traveler-app-with-sos-button-only-api-en', require('./routes/gap_no_mobile_traveler_app_with_sos_button_only_api_en'));
app.use('/api/gap-no-integration-with-international-assistance-provi', require('./routes/gap_no_integration_with_international_assistance_provi'));
app.use('/api/gap-no-multi-tenant-org-department-hierarchy', require('./routes/gap_no_multi_tenant_org_department_hierarchy'));
