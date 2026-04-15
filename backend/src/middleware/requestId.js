/**
 * Request ID Middleware
 * Adds unique request ID for tracking and debugging
 * 
 * @module middleware/requestId
 */

/**
 * Attaches unique request ID to each request
 * Uses X-Request-ID header if provided, otherwise generates new ID
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

module.exports = requestId;
