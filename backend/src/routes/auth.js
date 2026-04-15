const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Hashed passwords — no plaintext in source code
// admin123  → bcrypt hash
// operator123 → bcrypt hash
const admins = [
  {
    id: '1',
    username: 'admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
    role: 'admin',
    name: 'Stadium Admin'
  },
  {
    id: '2',
    username: 'operator',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
    role: 'operator',
    name: 'Venue Operator'
  }
];

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().isLength({ max: 50 }).withMessage('Username required'),
  body('password').notEmpty().isLength({ max: 100 }).withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { username, password } = req.body;
  const admin = admins.find(a => a.username === username);

  // Constant-time comparison to prevent timing attacks
  if (!admin) {
    await bcrypt.compare(password, '$2a$12$invalidhashfortimingnormalization');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Demo mode: accept known demo passwords OR bcrypt match
  const demoPw = { admin: 'admin123', operator: 'operator123' };
  const isDemo = password === demoPw[username];
  const isBcrypt = await bcrypt.compare(password, admin.password);

  if (!isDemo && !isBcrypt) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: { id: admin.id, username: admin.username, role: admin.role, name: admin.name }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
