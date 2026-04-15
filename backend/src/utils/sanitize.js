/**
 * Input sanitization utilities
 * Prevents XSS and injection attacks
 */

// Strip HTML tags and dangerous characters
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Sanitize an object's string values recursively
function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return obj; // prevent infinite recursion
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeObject(value, depth + 1);
  }
  return result;
}

// Express middleware — sanitizes req.body
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

module.exports = { sanitizeString, sanitizeObject, sanitizeBody };
