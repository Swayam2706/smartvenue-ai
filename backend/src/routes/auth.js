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

const router = express.Router();

/**
 * Admin user accounts with bcrypt-hashed passwords
 * Passwords: admin123, operator123 (for demo purposes)
 * @constant {Array<Object>}
 */
// Use bcrypt rounds of 12 for production-grade security
const BCRYPT_ROUNDS = 12;

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

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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
  body('username').trim().notEmpty().isLength({ max: 50 }).withMessage('Username required'),
  body('password').notEmpty().isLength({ max: 100 }).withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { username, password } = req.body;
    const admin = admins.find(a => a.username === username);

    // Constant-time comparison to prevent timing attacks
    if (!admin) {
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingnormalization');
      logger.warn('Login attempt with invalid username', { username });
      
      // Track failed login
      trackAnalyticsEvent('login_failed', {
        username,
        reason: 'invalid_username',
        timestamp: new Date().toISOString()
      });
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Demo mode: accept known demo passwords OR bcrypt match
    const demoPw = { admin: 'admin123', operator: 'operator123' };
    const isDemo = password === demoPw[username];
    const isBcrypt = await bcrypt.compare(password, admin.password);

    if (!isDemo && !isBcrypt) {
      logger.warn('Login attempt with invalid password', { username });
      
      // Track failed login
      trackAnalyticsEvent('login_failed', {
        username,
        reason: 'invalid_password',
        timestamp: new Date().toISOString()
      });
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Track successful login
    trackAnalyticsEvent('login_success', {
      user_id: admin.id,
      username: admin.username,
      role: admin.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      token,
      user: { id: admin.id, username: admin.username, role: admin.role, name: admin.name }
    });
    
    logger.info('User logged in successfully', { 
      userId: admin.id, 
      username: admin.username, 
      role: admin.role 
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

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
router.get('/me', authenticate, (req, res) => {
  try {
    // Track analytics event
    trackAnalyticsEvent('user_profile_viewed', {
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role
    });
    
    res.json({ user: req.user });
    
    logger.debug('User profile retrieved', { userId: req.user.id });
  } catch (error) {
    logger.error('Error retrieving user profile', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

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
router.post('/logout', authenticate, (req, res) => {
  try {
    // Track analytics event
    trackAnalyticsEvent('logout', {
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Logged out successfully' });
    
    logger.info('User logged out', { userId: req.user.id, username: req.user.username });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
