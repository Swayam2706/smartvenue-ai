const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { sanitizeBody } = require('./utils/sanitize');
const { performanceMonitoring } = require('./utils/performance');
const requestId = require('./middleware/requestId');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const crowdRoutes = require('./routes/crowd');
const navigationRoutes = require('./routes/navigation');
const queueRoutes = require('./routes/queue');
const alertRoutes = require('./routes/alerts');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const monitoringRoutes = require('./routes/monitoring');

const app = express();

// Request ID tracking
app.use(requestId);

// Performance monitoring
app.use(performanceMonitoring());

// Compression — reduces response size significantly
app.use(compression());

// Security headers - Enhanced
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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  dnsPrefetchControl: { allow: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
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

// Cookie parser for CSRF protection
app.use(cookieParser());

// Body parsing with strict limits
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 50 }));

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
app.use('/api/monitoring', monitoringRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler with request ID tracking
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.error('Request error', {
    requestId,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId,
    code: err.code || 'INTERNAL_ERROR'
  });
});

module.exports = app;
