const express = require('express');
const router = express.Router();
const https = require('https');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const SYSTEM_PROMPT =
  'You are an expert travel security analyst with deep knowledge of geopolitical risks, threat assessment, and crisis management. Provide actionable, life-safety focused recommendations.';

router.use(authenticateToken);
router.use(aiLimiter);

function callOpenRouter(messages) {
  return new Promise((resolve, reject) => {
    if (!process.env.OPENROUTER_API_KEY) {
      const err = new Error('OPENROUTER_API_KEY missing');
      err.code = 'NO_KEY';
      return reject(err);
    }
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages,
      max_tokens: 1500,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return reject(new Error(parsed.error.message || 'OpenRouter API error'));
          const text = parsed.choices?.[0]?.message?.content || '';
          resolve(text);
        } catch (err) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function handleAIError(error, res, context) {
  console.error(`[${new Date().toISOString()}] AI error in ${context}:`, error.message, error.stack);
  if (error.code === 'NO_KEY') {
    return res.status(503).json({
      error: `AI service unavailable (${context}): no OPENROUTER_API_KEY configured.`,
      retry_hint: 'Set OPENROUTER_API_KEY in environment.',
    });
  }
  res.status(503).json({
    error: `AI service temporarily unavailable (${context}). Please retry in a few minutes.`,
    retry_hint: 'Wait 1-2 minutes and retry your request.',
  });
}

// ─── POST /api/ai/real-time-threat ────────────────────────────────────────────
router.post(
  '/real-time-threat',
  [
    body('location_coordinates')
      .notEmpty().withMessage('location_coordinates is required')
      .isObject().withMessage('location_coordinates must be an object with lat and lng'),
    body('location_coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location_coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('current_events')
      .optional()
      .isArray().withMessage('current_events must be an array'),
    body('current_events.*').optional().isString().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { location_coordinates, current_events = [] } = req.body;
      const { lat, lng } = location_coordinates;

      const eventsText = current_events.length > 0
        ? current_events.map((e, i) => `${i + 1}. ${e}`).join('\n')
        : 'No specific events reported.';

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Provide an immediate real-time threat assessment for coordinates: Lat ${lat}, Lng ${lng}

Current reported events:
${eventsText}

Respond in JSON format:
{
  "threat_level": "critical|high|medium|low",
  "immediate_risks": ["risk 1", "risk 2", ...],
  "safe_corridors": [
    { "direction": "...", "description": "...", "distance_km": ... }
  ],
  "embassy_contacts": [
    { "country": "...", "address": "...", "phone": "...", "emergency_phone": "..." }
  ],
  "immediate_actions": ["action 1", "action 2", ...],
  "avoid_areas": ["area 1", "area 2", ...],
  "assessment_confidence": "high|moderate|low",
  "reassess_in_minutes": 30
}`
        }
      ];

      const aiText = await callOpenRouter(messages);
      let parsed = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}

      res.json({
        success: true,
        coordinates: { lat, lng },
        assessment: parsed || { raw: aiText },
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      handleAIError(error, res, 'real-time-threat');
    }
  }
);

// ─── POST /api/ai/evacuation-planner ─────────────────────────────────────────
router.post(
  '/evacuation-planner',
  [
    body('traveler_location')
      .notEmpty().withMessage('traveler_location is required')
      .isString().isLength({ max: 500 }),
    body('threat_level')
      .notEmpty().withMessage('threat_level is required')
      .isIn(['critical', 'high', 'medium', 'low']).withMessage('threat_level must be critical, high, medium, or low'),
    body('exit_options')
      .optional()
      .isArray().withMessage('exit_options must be an array'),
    body('exit_options.*').optional().isString().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { traveler_location, threat_level, exit_options = [] } = req.body;

      const exitText = exit_options.length > 0
        ? exit_options.map((e, i) => `${i + 1}. ${e}`).join('\n')
        : 'Not specified — provide general options.';

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Create a prioritized evacuation plan for a traveler.

Current Location: ${traveler_location}
Threat Level: ${threat_level}
Available Exit Options:
${exitText}

Respond in JSON format:
{
  "priority_route": {
    "description": "...",
    "steps": ["step 1", "step 2", ...],
    "estimated_time_hours": ...,
    "risk_level": "..."
  },
  "alternative_routes": [
    {
      "description": "...",
      "steps": ["step 1", ...],
      "estimated_time_hours": ...,
      "risk_level": "..."
    }
  ],
  "checkpoints": [
    { "location": "...", "action": "...", "contact": "..." }
  ],
  "timing_advice": "...",
  "items_to_bring": ["item 1", ...],
  "items_to_leave": ["item 1", ...],
  "communications": {
    "notify_contacts": true,
    "check_in_frequency_hours": ...,
    "embassy_notification": true
  },
  "abort_conditions": ["condition 1", ...]
}`
        }
      ];

      const aiText = await callOpenRouter(messages);
      let parsed = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}

      res.json({
        success: true,
        traveler_location,
        threat_level,
        evacuation_plan: parsed || { raw: aiText },
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      handleAIError(error, res, 'evacuation-planner');
    }
  }
);

// ─── POST /api/ai/medical-risk ────────────────────────────────────────────────
router.post(
  '/medical-risk',
  [
    body('destination')
      .notEmpty().withMessage('destination is required')
      .isString().isLength({ max: 200 }),
    body('traveler_health_conditions')
      .optional()
      .isArray().withMessage('traveler_health_conditions must be an array'),
    body('traveler_health_conditions.*').optional().isString().isLength({ max: 200 }),
    body('trip_duration')
      .notEmpty().withMessage('trip_duration is required')
      .isString().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { destination, traveler_health_conditions = [], trip_duration } = req.body;

      const healthContext = traveler_health_conditions.length > 0
        ? traveler_health_conditions.join(', ')
        : 'No pre-existing conditions reported';

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Provide a comprehensive medical risk assessment for a traveler.

Destination: ${destination}
Trip Duration: ${trip_duration}
Traveler Health Conditions: ${healthContext}

Respond in JSON format:
{
  "overall_medical_risk": "critical|high|medium|low",
  "medical_facility_quality": {
    "rating": "excellent|good|fair|poor",
    "nearest_international_hospital": "...",
    "trauma_care_available": true,
    "notes": "..."
  },
  "disease_risks": [
    { "disease": "...", "risk_level": "...", "seasonal": true, "notes": "..." }
  ],
  "vaccinations": {
    "required": ["vaccine 1", ...],
    "recommended": ["vaccine 1", ...],
    "timing_advice": "..."
  },
  "medications_to_bring": ["medication 1", ...],
  "pharmacy_access": {
    "availability": "good|limited|poor",
    "notes": "..."
  },
  "health_conditions_advice": [
    { "condition": "...", "specific_risks": "...", "precautions": "..." }
  ],
  "emergency_medical_contacts": [
    { "service": "...", "phone": "...", "notes": "..." }
  ],
  "travel_insurance_recommendation": "..."
}`
        }
      ];

      const aiText = await callOpenRouter(messages);
      let parsed = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}

      res.json({
        success: true,
        destination,
        trip_duration,
        medical_assessment: parsed || { raw: aiText },
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      handleAIError(error, res, 'medical-risk');
    }
  }
);

// ─── POST /api/ai/cyber-security ──────────────────────────────────────────────
router.post(
  '/cyber-security',
  [
    body('destination')
      .notEmpty().withMessage('destination is required')
      .isString().isLength({ max: 200 }),
    body('traveler_role')
      .notEmpty().withMessage('traveler_role is required')
      .isString().isLength({ max: 200 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { destination, traveler_role } = req.body;

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Provide digital security recommendations for a traveler.

Destination: ${destination}
Traveler Role: ${traveler_role}

Respond in JSON format:
{
  "overall_cyber_risk": "critical|high|medium|low",
  "vpn_recommendation": {
    "required": true,
    "reason": "...",
    "recommended_providers": ["provider 1", ...]
  },
  "device_hardening": [
    { "action": "...", "priority": "critical|high|medium", "instructions": "..." }
  ],
  "data_sensitivity_rules": [
    { "data_type": "...", "rule": "...", "reason": "..." }
  ],
  "network_safety": [
    { "scenario": "...", "recommendation": "..." }
  ],
  "communications_security": {
    "encrypted_apps": ["Signal", "..."],
    "avoid_apps": ["...", "..."],
    "email_guidance": "..."
  },
  "physical_device_security": ["tip 1", "tip 2", ...],
  "before_travel_checklist": ["action 1", ...],
  "after_travel_checklist": ["action 1", ...],
  "role_specific_warnings": ["warning 1", ...]
}`
        }
      ];

      const aiText = await callOpenRouter(messages);
      let parsed = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}

      res.json({
        success: true,
        destination,
        traveler_role,
        cyber_security_assessment: parsed || { raw: aiText },
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      handleAIError(error, res, 'cyber-security');
    }
  }
);

// ─── POST /api/ai/itinerary-risk-score ────────────────────────────────────────
router.post(
  '/itinerary-risk-score',
  [
    body('trip').notEmpty().withMessage('trip is required').isObject(),
    body('threats').optional().isArray(),
    body('advisories').optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { trip, threats = [], advisories = [] } = req.body;

      const threatsText = threats.length ? threats.map((t, i) => `${i + 1}. ${typeof t === 'string' ? t : JSON.stringify(t)}`).join('\n') : 'None provided.';
      const advText = advisories.length ? advisories.map((a, i) => `${i + 1}. ${typeof a === 'string' ? a : JSON.stringify(a)}`).join('\n') : 'None provided.';

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Synthesize a single composite risk score for this itinerary.

Trip: ${JSON.stringify(trip)}
Threats:
${threatsText}
Advisories:
${advText}

Respond in JSON:
{
  "overall_risk_score": <0-100>,
  "risk_band": "critical|high|medium|low",
  "drivers": [{"factor": "...", "impact": "..."}],
  "per_leg_scores": [{"leg": "...", "score": <0-100>}],
  "mitigations": ["..."],
  "watch_indicators": ["..."]
}`
        }
      ];

      const aiText = await callOpenRouter(messages);
      let parsed = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}

      res.json({
        success: true,
        trip,
        risk_assessment: parsed || { raw: aiText },
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      handleAIError(error, res, 'itinerary-risk-score');
    }
  }
);

module.exports = router;
