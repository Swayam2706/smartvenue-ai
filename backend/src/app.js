const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { sanitizeBody } = require('./utils/sanitize');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const crowdRoutes = require('./routes/crowd');
const navigationRoutes = require('./routes/navigation');
const queueRoutes = require('./routes/queue');
const alertRoutes = require('./routes/alerts');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Compression — reduces response size significantly
app.use(compression());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https://generativelanguage.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow Firebase Hosting URL + local dev + Cloud Run
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Firebase Hosting
    if (/\.web\.app$/.test(origin) || /\.firebaseapp\.com$/.test(origin)) {
      return callback(null, true);
    }
    // Allow Cloud Run domains
    if (/\.run\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// Rate limiting — stricter on auth routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// XSS sanitization on all request bodies
app.use(sanitizeBody);

// Logging — use structured logger
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    logger.http(`${req.method} ${req.path}`, { ip: req.ip, ua: req.get('user-agent')?.slice(0, 50) });
    next();
  });
}

// Health check with cache headers
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SmartVenue AI' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
