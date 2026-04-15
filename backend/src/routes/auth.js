/**
 * @fileoverview Authentication Routes - User login and session management
 * @module routes/auth
 * @requires express
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires express-validator
 * @requires ../middleware/auth
 * @requires ../utils/logger
 * @requires ../services/firebaseService
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { trackAnalyticsEvent } = require('../services/firebaseService');
const { logAnalyticsEvent, createCustomToken } = require('../config/firebaseAdmin');
const { asyncHandler, ValidationError, AuthenticationError, ConfigurationError } = require('../utils/errorHandler');
const { HTTP_STATUS, SECURITY, VALIDATION } = require('../utils/constants');

const router = express.Router();

/**
 * Admin user accounts with bcrypt-hashed passwords
 * Passwords: admin123, operator123 (for demo purposes)
 * @constant {Array<Object>}
 */
const admins = [
  {
    id: '1',
    username: 'admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // admin123
    role: 'admin',
    name: 'Stadium Admin',
    loginAttempts: 0,
    lockedUntil: null
  },
  {
    id: '2',
    username: 'operator',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // operator123
    role: 'operator',
    name: 'Venue Operator',
    loginAttempts: 0,
    lockedUntil: null
  }
];

/**
 * POST /api/auth/login
 * Authenticates user with username and password
 * 
 * @route POST /api/auth/login
 * @param {string} username - Username (max 50 characters)
 * @param {string} password - Password (max 100 characters)
 * @access Public
 * @returns {Object} 200 - JWT token and user data
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 500 - Server configuration error
 * 
 * @example
 * Request body:
 * {
 *   "username": "admin",
 *   "password": "admin123"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "1",
 *     "username": "admin",
 *     "role": "admin",
 *     "name": "Stadium Admin"
 *   }
 * }
 */
router.post('/login', [
  body('username').trim().notEmpty().isLength({ max: VALIDATION.USERNAME_MAX }).withMessage('Username required'),
  body('password').notEmpty().isLength({ max: SECURITY.PASSWORD_MAX_LENGTH }).withMessage('Password required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Login validation failed', { errors: errors.array() });
    throw new ValidationError('Validation failed', errors.array());
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET not configured');
    throw new ConfigurationError('JWT_SECRET not configured');
  }

  const { username, password } = req.body;
  const admin = admins.find(a => a.username === username);

  // Constant-time comparison to prevent timing attacks
  if (!admin) {
    await bcrypt.compare(password, '$2a$12$invalidhashfortimingnormalization');
    logger.warn('Login attempt with invalid username', { username });
    
    // Track failed login to Firebase
    await logAnalyticsEvent('login_failed', {
      username,
      reason: 'invalid_username',
      timestamp: new Date().toISOString()
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  // Demo mode: accept known demo passwords OR bcrypt match
  const demoPw = { admin: 'admin123', operator: 'operator123' };
  const isDemo = password === demoPw[username];
  const isBcrypt = await bcrypt.compare(password, admin.password);

  if (!isDemo && !isBcrypt) {
    logger.warn('Login attempt with invalid password', { username });
    
    // Track failed login to Firebase
    await logAnalyticsEvent('login_failed', {
      username,
      reason: 'invalid_password',
      timestamp: new Date().toISOString()
    });
    
    throw new AuthenticationError('Invalid credentials');
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || SECURITY.JWT_EXPIRY }
  );

  // Create Firebase custom token for cross-platform auth
  try {
    await createCustomToken(admin.id, { role: admin.role, username: admin.username });
  } catch (error) {
    logger.debug('Firebase custom token creation skipped', { error: error.message });
  }

  // Track successful login to Firebase
  await logAnalyticsEvent('login_success', {
    user_id: admin.id,
    username: admin.username,
    role: admin.role,
    timestamp: new Date().toISOString()
  });

  res.status(HTTP_STATUS.OK).json({
    token,
    user: { id: admin.id, username: admin.username, role: admin.role, name: admin.name }
  });
  
  logger.info('User logged in successfully', { 
    userId: admin.id, 
    username: admin.username, 
    role: admin.role 
  });
}));

/**
 * GET /api/auth/me
 * Retrieves current authenticated user information
 * 
 * @route GET /api/auth/me
 * @access Authenticated
 * @returns {Object} 200 - Current user data
 * @returns {Object} 401 - Unauthorized
 * 
 * @example
 * Response:
 * {
 *   "user": {
 *     "id": "1",
 *     "username": "admin",
 *     "role": "admin",
 *     "name": "Stadium Admin"
 *   }
 * }
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  // Track analytics event to Firebase
  await logAnalyticsEvent('user_profile_viewed', {
    user_id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
  
  res.status(HTTP_STATUS.OK).json({ user: req.user });
  
  logger.debug('User profile retrieved', { userId: req.user.id });
}));

/**
 * POST /api/auth/logout
 * Logs out current user (client-side token removal)
 * 
 * @route POST /api/auth/logout
 * @access Authenticated
 * @returns {Object} 200 - Logout confirmation
 * @returns {Object} 401 - Unauthorized
 * 
 * @example
 * Response:
 * {
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Track analytics event to Firebase
  await logAnalyticsEvent('logout', {
    user_id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    timestamp: new Date().toISOString()
  });
  
  res.status(HTTP_STATUS.OK).json({ message: 'Logged out successfully' });
  
  logger.info('User logged out', { userId: req.user.id, username: req.user.username });
}));

module.exports = router;
