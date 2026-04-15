/**
 * Application Constants
 * Centralized configuration and magic numbers
 * 
 * @module utils/constants
 */

/**
 * HTTP Status Codes
 * @enum {number}
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Error Codes
 * @enum {string}
 */
const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  CSRF_INVALID: 'CSRF_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED'
};

/**
 * User Roles
 * @enum {string}
 */
const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  USER: 'user',
  GUEST: 'guest'
};

/**
 * Risk Levels
 * @enum {string}
 */
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Alert Types
 * @enum {string}
 */
const ALERT_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EVACUATION: 'evacuation'
};

/**
 * Cache TTL (Time To Live) in milliseconds
 * @enum {number}
 */
const CACHE_TTL = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 5 * 60 * 1000,  // 5 minutes
  LONG: 60 * 60 * 1000,   // 1 hour
  DAY: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Rate Limit Configuration
 * @enum {Object}
 */
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60
  }
};

/**
 * Security Configuration
 * @enum {Object}
 */
const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100
};

/**
 * Pagination Defaults
 * @enum {number}
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * WebSocket Configuration
 * @enum {Object}
 */
const WEBSOCKET = {
  PING_INTERVAL: 30000, // 30 seconds
  UPDATE_INTERVAL: 4000, // 4 seconds
  MAX_PAYLOAD: 1024 * 1024 // 1MB
};

/**
 * Simulation Configuration
 * @enum {Object}
 */
const SIMULATION = {
  TICK_INTERVAL: 4000, // 4 seconds
  PREDICTION_POINTS: 5,
  MAX_HISTORY: 30,
  DENSITY_MIN: 0.02,
  DENSITY_MAX: 0.98
};

/**
 * Validation Limits
 * @enum {Object}
 */
const VALIDATION = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  MESSAGE_MAX: 500,
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 1000,
  ZONE_ID_MAX: 50
};

/**
 * Log Levels
 * @enum {string}
 */
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  HTTP: 'http'
};

/**
 * Environment Types
 * @enum {string}
 */
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging'
};

/**
 * Google Cloud Services
 * @enum {string}
 */
const GOOGLE_SERVICES = {
  STORAGE: 'storage',
  LOGGING: 'logging',
  ERROR_REPORTING: 'error_reporting',
  MONITORING: 'monitoring',
  PUBSUB: 'pubsub',
  FIREBASE: 'firebase'
};

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  RISK_LEVELS,
  ALERT_TYPES,
  CACHE_TTL,
  RATE_LIMITS,
  SECURITY,
  PAGINATION,
  WEBSOCKET,
  SIMULATION,
  VALIDATION,
  LOG_LEVELS,
  ENVIRONMENTS,
  GOOGLE_SERVICES
};
