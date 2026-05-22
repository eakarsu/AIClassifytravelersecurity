const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { travelers_screened: 1284, watchlist_hits: 6, false_positive_reviews: 4, escalations: 2 },
    matches: [
      { traveler: 'T-10492', itinerary: 'JFK-IST-NBO', signal: 'document/name similarity', confidence: 82, action: 'manual analyst review' },
      { traveler: 'T-11720', itinerary: 'LHR-DOH-SIN', signal: 'restricted zone proximity', confidence: 74, action: 'secondary screening' },
      { traveler: 'T-11903', itinerary: 'SFO-MEX', signal: 'duplicate identity pattern', confidence: 68, action: 'verify documents' },
    ],
  });
});

router.post('/screen', (req, res) => {
  const { travelerId = 'traveler', confidence = 0 } = req.body || {};
  res.json({ travelerId, decision: confidence >= 80 ? 'escalate' : 'review', checks: ['identity similarity', 'route risk', 'zone history'] });
});

module.exports = router;
