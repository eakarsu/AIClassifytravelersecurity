const rateLimit = require('express-rate-limit');

// 20 AI calls per hour per authenticated user (keyed on IP as fallback)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests. You are limited to 20 AI calls per hour. Please try again later.',
    retry_after: '1 hour',
  },
  keyGenerator: (req) => {
    // Prefer user id from JWT if available, else IP
    return req.user?.id ? `user_${req.user.id}` : req.ip;
  },
});

module.exports = { aiLimiter };
