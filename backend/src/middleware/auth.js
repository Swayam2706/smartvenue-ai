/**
 * Authentication Middleware
 * Provides JWT-based authentication and role-based authorization
 * 
 * Security features:
 * - JWT token validation with expiry
 * - Role-based access control (RBAC)
 * - Secure error handling without information leakage
 * - Token format validation
 * 
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Validates JWT token and attaches user to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @security
 * - Validates Bearer token format
 * - Verifies JWT signature and expiry
 * - Prevents timing attacks with consistent error responses
 * - Logs authentication failures for security monitoring
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Validate Authorization header format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authentication failed: Missing or invalid Authorization header', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Validate JWT_SECRET configuration
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('FATAL: JWT_SECRET environment variable is not set');
    return res.status(500).json({ 
      error: 'Server configuration error',
      code: 'CONFIG_ERROR'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Validate token is not empty
  if (!token || token.length === 0) {
    logger.warn('Authentication failed: Empty token', { ip: req.ip });
    return res.status(401).json({ 
      error: 'Invalid token format',
      code: 'INVALID_TOKEN'
    });
  }

  try {
    // Verify JWT token with signature and expiry validation
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Explicitly specify allowed algorithms
      maxAge: '7d' // Maximum token age
    });
    
    // Validate decoded token structure
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token payload');
    }
    
    // Attach user to request for downstream middleware
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name
    };
    
    logger.debug('Authentication successful', { 
      userId: decoded.id, 
      role: decoded.role 
    });
    
    next();
  } catch (err) {
    // Log authentication failure with error details
    logger.warn('Authentication failed: Token verification error', {
      error: err.message,
      ip: req.ip,
      path: req.path
    });
    
    // Return consistent error response to prevent timing attacks
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * Restricts access to admin users only
 * Must be used after authenticate middleware
 * 
 * @param {Object} req - Express request object with req.user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @security
 * - Validates user role from authenticated token
 * - Logs unauthorized access attempts
 * - Returns 403 Forbidden for non-admin users
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    logger.error('adminOnly middleware called without authentication');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
  }
  
  next();
};

/**
 * Restricts access to admin or operator roles
 * Must be used after authenticate middleware
 * 
 * @param {Object} req - Express request object with req.user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const operatorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const allowedRoles = ['admin', 'operator'];
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn('Unauthorized operator access attempt', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });
    return res.status(403).json({ 
      error: 'Operator or admin access required',
      code: 'FORBIDDEN'
    });
  }
  
  next();
};

module.exports = { 
  authenticate, 
  adminOnly,
  operatorOrAdmin
};
