const express = require('express');
const router = express.Router();
const https = require('https');
const { pool } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

router.use(authenticateToken);

// Helper function to call OpenRouter API
function callOpenRouter(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: messages
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
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'OpenRouter API error'));
          }
          const text = parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content
            : '';
          resolve(text);
        } catch (err) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// Helper to parse sections from AI text
function parseSections(text) {
  const sections = {};
  const lines = text.split('\n');
  let currentSection = 'general';
  let currentContent = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s+(.+)/);
    if (headerMatch) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = headerMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

// POST /classify-alert
router.post('/classify-alert', async (req, res) => {
  try {
    const { id, title, description, region, category } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are a travel security analyst AI. Respond with structured analysis. Use markdown headers for sections.'
      },
      {
        role: 'user',
        content: `Classify the following security alert and provide:
1. **Severity** (critical, high, medium, or low)
2. **Risk Score** (0-100)
3. **Recommended Actions** (list of specific actions)
4. **Affected Demographics** (who is most at risk)

Alert Details:
- Title: ${title}
- Description: ${description}
- Region: ${region}
- Category: ${category}`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    // Extract risk score from text
    const riskScoreMatch = aiText.match(/risk\s*score[:\s]*(\d+)/i);
    const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1], 10) : null;

    // Save to database if alert id provided
    if (id) {
      await pool.query(
        'UPDATE security_alerts SET ai_classification = $1, ai_risk_score = $2, updated_at = NOW() WHERE id = $3',
        [aiText, riskScore, id]
      );
    }

    res.json({
      raw_response: aiText,
      parsed: sections,
      risk_score: riskScore,
      alert_id: id || null
    });
  } catch (error) {
    console.error('Error classifying alert:', error);
    res.status(500).json({ error: 'Failed to classify alert: ' + error.message });
  }
});

// POST /assess-risk
router.post('/assess-risk', async (req, res) => {
  try {
    const { name, country, current_alerts } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are a travel security risk assessment AI. Provide detailed, structured risk assessments using markdown headers.'
      },
      {
        role: 'user',
        content: `Provide a detailed risk assessment for the following destination:
- Destination: ${name}
- Country: ${country}
- Current Alerts: ${current_alerts || 'None provided'}

Provide risk scores (critical, high, medium, or low) for each category:
1. **Political Risk**
2. **Terrorism Risk**
3. **Crime Risk**
4. **Health Risk**
5. **Natural Disaster Risk**
6. **Infrastructure Risk**

Also provide:
- **Overall Risk Level** (critical, high, medium, or low)
- **Overall Risk Score** (0-100)
- **Summary** of the risk landscape
- **Recommendations** for travelers`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    // Extract risk levels from response
    const extractLevel = (label) => {
      const regex = new RegExp(label + '[:\\s]*(critical|high|medium|low)', 'i');
      const match = aiText.match(regex);
      return match ? match[1].toLowerCase() : 'low';
    };

    const overallRisk = extractLevel('overall risk');
    const riskScoreMatch = aiText.match(/(?:overall\s*)?risk\s*score[:\s]*(\d+)/i);
    const riskScore = riskScoreMatch ? parseInt(riskScoreMatch[1], 10) : 0;

    // Save to risk_assessments table
    const result = await pool.query(
      `INSERT INTO risk_assessments
        (destination, country, overall_risk, political_risk, terrorism_risk, crime_risk,
         health_risk, natural_disaster_risk, infrastructure_risk, risk_score, summary,
         recommendations, assessed_by, ai_assessment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        name, country, overallRisk,
        extractLevel('political'),
        extractLevel('terrorism'),
        extractLevel('crime'),
        extractLevel('health'),
        extractLevel('natural disaster'),
        extractLevel('infrastructure'),
        riskScore,
        sections.summary || '',
        sections.recommendations || '',
        'AI Assessment',
        aiText
      ]
    );

    res.json({
      raw_response: aiText,
      parsed: sections,
      risk_assessment: result.rows[0]
    });
  } catch (error) {
    console.error('Error assessing risk:', error);
    res.status(500).json({ error: 'Failed to assess risk: ' + error.message });
  }
});

// POST /analyze-threat
router.post('/analyze-threat', async (req, res) => {
  try {
    const { title, description, region, threat_type } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are a threat intelligence analyst AI. Provide detailed, structured threat analyses using markdown headers.'
      },
      {
        role: 'user',
        content: `Analyze the following threat and provide a detailed assessment:
- Title: ${title}
- Description: ${description}
- Region: ${region}
- Threat Type: ${threat_type}

Provide:
1. **Threat Level** (critical, high, medium, or low)
2. **Impact Assessment** - detailed analysis of potential impact
3. **Affected Areas** - geographic and demographic scope
4. **Mitigation Strategies** - specific recommended countermeasures
5. **Confidence Level** (confirmed, high, moderate, low, or unverified)
6. **Potential Escalation** - likelihood and scenarios`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    // Extract threat level and confidence
    const threatLevelMatch = aiText.match(/threat\s*level[:\s]*(critical|high|medium|low)/i);
    const threatLevel = threatLevelMatch ? threatLevelMatch[1].toLowerCase() : 'medium';

    const confidenceMatch = aiText.match(/confidence\s*level[:\s]*(confirmed|high|moderate|low|unverified)/i);
    const confidenceLevel = confidenceMatch ? confidenceMatch[1].toLowerCase() : 'moderate';

    // Save to threat_analyses table
    const result = await pool.query(
      `INSERT INTO threat_analyses
        (title, threat_type, region, threat_level, description, potential_impact,
         affected_areas, mitigation_strategies, intelligence_source, confidence_level,
         status, ai_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        title, threat_type, region, threatLevel, description,
        sections.impact_assessment || '',
        sections.affected_areas || '',
        sections.mitigation_strategies || '',
        'AI Analysis',
        confidenceLevel,
        'active',
        aiText
      ]
    );

    res.json({
      raw_response: aiText,
      parsed: sections,
      threat_analysis: result.rows[0]
    });
  } catch (error) {
    console.error('Error analyzing threat:', error);
    res.status(500).json({ error: 'Failed to analyze threat: ' + error.message });
  }
});

// POST /generate-advisory
router.post('/generate-advisory', async (req, res) => {
  try {
    const { country, region, situation } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are a travel advisory specialist AI. Generate official-style travel advisories with structured sections using markdown headers.'
      },
      {
        role: 'user',
        content: `Generate a travel advisory for the following:
- Country: ${country}
- Region: ${region || 'Nationwide'}
- Current Situation: ${situation}

Provide:
1. **Advisory Level** (do_not_travel, reconsider, exercise_caution, or normal)
2. **Title** - concise advisory title
3. **Key Risks** - main risks travelers should be aware of
4. **Recommendations** - specific guidance for travelers
5. **Description** - detailed situation overview`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    // Extract advisory level
    const levelMatch = aiText.match(/advisory\s*level[:\s]*(do_not_travel|reconsider|exercise_caution|normal)/i);
    const advisoryLevel = levelMatch ? levelMatch[1].toLowerCase() : 'exercise_caution';

    // Extract title from response or use default
    const titleMatch = aiText.match(/(?:^|\n)#+\s*title[:\s]*(.+)/im);
    const advisoryTitle = titleMatch
      ? titleMatch[1].trim()
      : `Travel Advisory: ${country}${region ? ' - ' + region : ''}`;

    // Save to travel_advisories table
    const result = await pool.query(
      `INSERT INTO travel_advisories
        (title, country, region, advisory_level, issued_by, issued_date,
         description, key_risks, recommendations, status, ai_summary)
       VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        advisoryTitle, country, region || null, advisoryLevel,
        'AI Generated',
        sections.description || aiText,
        sections.key_risks || '',
        sections.recommendations || '',
        'active',
        aiText
      ]
    );

    res.json({
      raw_response: aiText,
      parsed: sections,
      advisory: result.rows[0]
    });
  } catch (error) {
    console.error('Error generating advisory:', error);
    res.status(500).json({ error: 'Failed to generate advisory: ' + error.message });
  }
});

// POST /summarize-situation
router.post('/summarize-situation', async (req, res) => {
  try {
    const { region, country } = req.body;
    const location = country || region;

    // Fetch active alerts for the location
    const alertsResult = await pool.query(
      `SELECT title, description, severity, category, created_at
       FROM security_alerts
       WHERE status = 'active'
         AND (region ILIKE $1 OR country ILIKE $1 OR city ILIKE $1)
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${location}%`]
    );

    const alertsSummary = alertsResult.rows.length > 0
      ? alertsResult.rows.map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n')
      : 'No active alerts found for this location.';

    const messages = [
      {
        role: 'system',
        content: 'You are a security situation analyst AI. Provide comprehensive situation summaries using markdown headers.'
      },
      {
        role: 'user',
        content: `Provide a comprehensive security situation summary for: ${location}

Active Alerts (${alertsResult.rows.length} found):
${alertsSummary}

Provide:
1. **Overall Risk Level** (critical, high, medium, or low)
2. **Situation Overview** - current state of affairs
3. **Key Concerns** - primary security issues
4. **Trends** - whether situation is improving, stable, or deteriorating
5. **Recommendations** - actionable guidance for travelers and security teams
6. **Areas to Monitor** - specific areas or issues that require ongoing attention`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    res.json({
      raw_response: aiText,
      parsed: sections,
      location: location,
      active_alerts_count: alertsResult.rows.length,
      alerts_used: alertsResult.rows
    });
  } catch (error) {
    console.error('Error summarizing situation:', error);
    res.status(500).json({ error: 'Failed to summarize situation: ' + error.message });
  }
});

// POST /analyze-incident
router.post('/analyze-incident', async (req, res) => {
  try {
    const { id, title, description, incident_type, severity, location, country, affected_travelers_count } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an incident response analyst AI. Provide detailed incident analysis with actionable response priorities using markdown headers.'
      },
      {
        role: 'user',
        content: `Analyze the following security incident:
- Title: ${title}
- Description: ${description}
- Incident Type: ${incident_type}
- Severity: ${severity || 'Unknown'}
- Location: ${location || 'Unknown'}
- Country: ${country || 'Unknown'}
- Affected Travelers: ${affected_travelers_count || 'Unknown'}

Provide:
1. **Incident Analysis** - detailed assessment of the incident
2. **Response Priorities** - ranked list of immediate actions needed
3. **Escalation Potential** - likelihood the situation will worsen (high, moderate, or low)
4. **Resource Requirements** - what resources are needed for response
5. **Communication Plan** - who needs to be notified and how
6. **Follow-up Actions** - medium and long-term actions needed`
      }
    ];

    const aiText = await callOpenRouter(messages);
    const sections = parseSections(aiText);

    // Save to incident_reports table if id provided
    if (id) {
      await pool.query(
        'UPDATE incident_reports SET ai_analysis = $1, updated_at = NOW() WHERE id = $2',
        [aiText, id]
      );
    }

    res.json({
      raw_response: aiText,
      parsed: sections,
      incident_id: id || null
    });
  } catch (error) {
    console.error('Error analyzing incident:', error);
    res.status(500).json({ error: 'Failed to analyze incident: ' + error.message });
  }
});

module.exports = router;
