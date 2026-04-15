/**
 * @fileoverview Chat Routes - AI-powered venue assistant with Gemini integration
 * @module routes/chat
 * @requires express
 * @requires express-validator
 * @requires ../simulation/crowdSimulator
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getCurrentState, getZones } = require('../simulation/crowdSimulator');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');

const router = express.Router();

/**
 * In-memory rate limiter for Gemini API (15 RPM free tier)
 * @type {Array<number>}
 */
const geminiLog = [];

/**
 * Checks if Gemini API rate limit has been exceeded
 * Implements sliding window rate limiting (14 requests per minute)
 * 
 * @returns {boolean} True if rate limited, false otherwise
 */
function isGeminiRateLimited() {
  const now = Date.now();
  const recent = geminiLog.filter(t => now - t < 60000);
  geminiLog.length = 0;
  geminiLog.push(...recent);
  if (recent.length >= 14) return true;
  geminiLog.push(now);
  return false;
}

/**
 * Generates rule-based response for common venue queries
 * Fallback when AI is unavailable or rate limited
 * 
 * @param {string} query - User query text
 * @param {Object} crowdState - Current crowd state from simulator
 * @returns {string} Formatted response with recommendations
 * 
 * @example
 * getRuleBasedResponse("where is the nearest restroom?", crowdState)
 * // returns "🚻 The least crowded restroom right now is..."
 */
function getRuleBasedResponse(query, crowdState) {
  const q = query.toLowerCase();

  if (q.includes('washroom') || q.includes('restroom') || q.includes('toilet') || q.includes('bathroom')) {
    const restrooms = ['restroom-1', 'restroom-2', 'restroom-3', 'restroom-4'];
    const best = restrooms
      .map(id => ({ id, ...crowdState[id] }))
      .sort((a, b) => a.current - b.current)[0];
    return `🚻 The least crowded restroom right now is **${best?.name}** with a wait time of approximately **${best?.waitTime} minutes**. Current occupancy: ${(best?.current * 100).toFixed(0)}%.`;
  }

  if (q.includes('exit') || q.includes('leave') || q.includes('out')) {
    const gates = ['gate-a', 'gate-b', 'gate-c', 'gate-d'];
    const best = gates
      .map(id => ({ id, ...crowdState[id] }))
      .sort((a, b) => a.current - b.current)[0];
    return `🚪 The fastest exit right now is **${best?.name}** with approximately **${best?.waitTime} minutes** wait. Current crowd level: ${(best?.current * 100).toFixed(0)}%.`;
  }

  if (q.includes('food') || q.includes('eat') || q.includes('hungry') || q.includes('snack')) {
    const courts = ['food-court-1', 'food-court-2', 'food-court-3', 'food-court-4'];
    const best = courts
      .map(id => ({ id, ...crowdState[id] }))
      .sort((a, b) => a.current - b.current)[0];
    return `🍔 The least busy food court is **${best?.name}** with a wait of about **${best?.waitTime} minutes**. Occupancy: ${(best?.current * 100).toFixed(0)}%.`;
  }

  if (q.includes('crowd') || q.includes('busy') || q.includes('congestion')) {
    const zones = Object.values(crowdState);
    const critical = zones.filter(z => z.riskLevel === 'critical').map(z => z.name);
    if (critical.length > 0) {
      return `⚠️ Currently **${critical.length} zone(s)** are critically crowded: ${critical.join(', ')}. I recommend avoiding these areas.`;
    }
    return `✅ Crowd levels are currently manageable across the venue. No critical zones detected.`;
  }

  if (q.includes('park') || q.includes('car')) {
    const north = crowdState['parking-north'];
    const south = crowdState['parking-south'];
    const best = north?.current < south?.current ? north : south;
    return `🅿️ **${best?.name}** has more availability right now (${(best?.current * 100).toFixed(0)}% full). Estimated wait: ${best?.waitTime} minutes.`;
  }

  if (q.includes('vip') || q.includes('lounge')) {
    const vip = crowdState['vip-lounge'];
    return `⭐ The VIP Lounge is currently at **${(vip?.current * 100).toFixed(0)}%** capacity with a wait of **${vip?.waitTime} minutes**.`;
  }

  if (q.includes('medical') || q.includes('first aid') || q.includes('emergency') || q.includes('help')) {
    return `🏥 The Medical Center is located at the West side of the venue. Current wait: **${crowdState['medical-center']?.waitTime || 5} minutes**. For emergencies, call **+1-800-STADIUM** or alert any staff member.`;
  }

  if (q.includes('seat') || q.includes('section') || q.includes('stand')) {
    return `💺 Use the Navigation feature to find the best route to your seat. Select your destination stand (North/South/East/West) and I'll calculate the least crowded path for you.`;
  }

  return `🤖 I can help you with: finding **restrooms**, **food courts**, **exit routes**, **parking**, **VIP lounge**, or **crowd status**. What would you like to know?`;
}

/**
 * Calls Google Gemini 1.5 Flash API for AI-powered responses
 * Includes venue context and current crowd status
 * 
 * @param {string} query - User query text
 * @param {Object} context - Venue context (critical zones, best options, etc.)
 * @returns {Promise<string|null>} AI response or null if unavailable
 * 
 * @example
 * await getAIResponse("What's the best exit?", {
 *   criticalZones: ["North Stand"],
 *   bestGate: "Gate B",
 *   totalZones: 20
 * })
 */
async function getAIResponse(query, context) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;
  if (isGeminiRateLimited()) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are SmartVenue AI, an intelligent stadium assistant.
Current venue status:
- Critical zones: ${context.criticalZones?.join(', ') || 'None'}
- Best exit: ${context.bestGate}
- Least crowded food: ${context.bestFood}
- Least crowded restroom: ${context.bestRestroom}
- Total zones monitored: ${context.totalZones}

User query: ${query}

Respond in 1-2 sentences. Be specific and helpful. Use relevant emojis.`
            }]
          }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/chat/message
 * Processes user chat messages with AI or rule-based responses
 * 
 * @route POST /api/chat/message
 * @param {string} message - User message (max 500 characters)
 * @access Public
 * @returns {Object} 200 - Chat response with AI flag
 * @returns {Object} 400 - Validation error
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * Request body:
 * {
 *   "message": "Where is the nearest restroom?"
 * }
 * 
 * Response:
 * {
 *   "response": "🚻 The least crowded restroom right now is...",
 *   "usedAI": true,
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
router.post('/message', [
  body('message').trim().notEmpty().withMessage('Message required').isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Chat message validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { message } = req.body;
    const crowdState = getCurrentState();

    const zones = Object.values(crowdState);
    const context = {
      totalZones: zones.length,
      criticalZones: zones.filter(z => z.riskLevel === 'critical').map(z => z.name),
      highRiskZones: zones.filter(z => z.riskLevel === 'high').map(z => z.name),
      bestGate: zones.filter(z => z.id?.includes('gate')).sort((a, b) => a.current - b.current)[0]?.name,
      bestFood: zones.filter(z => z.id?.includes('food')).sort((a, b) => a.current - b.current)[0]?.name,
      bestRestroom: zones.filter(z => z.id?.includes('restroom')).sort((a, b) => a.current - b.current)[0]?.name
    };

    let response = await getAIResponse(message, context);
    const usedAI = !!response;

    if (!response) {
      response = getRuleBasedResponse(message, crowdState);
    }

    // Track analytics event
    trackAnalyticsEvent('chat_message_sent', {
      message_length: message.length,
      used_ai: usedAI,
      critical_zones: context.criticalZones.length,
      query_type: message.toLowerCase().includes('restroom') ? 'restroom' :
                  message.toLowerCase().includes('food') ? 'food' :
                  message.toLowerCase().includes('exit') ? 'exit' : 'general'
    });

    res.json({ response, usedAI, timestamp: new Date().toISOString() });
    
    logger.info('Chat message processed', { 
      messageLength: message.length, 
      usedAI, 
      criticalZones: context.criticalZones.length 
    });
  } catch (error) {
    logger.error('Error processing chat message', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to process message',
      response: '🤖 Sorry, I encountered an error. Please try again.',
      usedAI: false,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
