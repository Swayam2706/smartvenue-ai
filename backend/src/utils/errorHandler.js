/**
 * Centralized Error Handling
 * Custom error classes and error handling utilities
 * 
 * @module utils/errorHandler
 */

const { HTTP_STATUS, ERROR_CODES } = require('./constants');
const { reportError } = require('../config/googleCloud');
const logger = require('./logger');

/**
 * Base Application Error
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an application error
   * 
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code
   * @param {boolean} isOperational - Is this an operational error?
   */
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 * @extends AppError
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    this.errors = errors;
  }
}

/**
 * Authentication Error
 * @extends AppError
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED);
  }
}

/**
 * Authorization Error
 * @extends AppError
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }
}

/**
 * Not Found Error
 * @extends AppError
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
}

/**
 * Rate Limit Error
 * @extends AppError
 */
class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    this.retryAfter = retryAfter;
  }
}

/**
 * Configuration Error
 * @extends AppError
 */
class ConfigurationError extends AppError {
  constructor(message = 'Server configuration error') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.CONFIG_ERROR, false);
  }
}

/**
 * Handle operational errors
 * 
 * @param {Error} error - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {void}
 */
function handleOperationalError(error, req, res) {
  const requestId = req.id || 'unknown';
  
  logger.warn('Operational error', {
    requestId,
    error: error.message,
    code: error.code,
    path: req.path,
    method: req.method
  });

  res.status(error.statusCode).json({
    error: error.message,
    code: error.code,
    requestId,
    ...(error.errors && { errors: error.errors }),
    ...(error.retryAfter && { retryAfter: error.retryAfter })
  });
}

/**
 * Handle programming errors
 * 
 * @param {Error} error - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {void}
 */
function handleProgrammingError(error, req, res) {
  const requestId = req.id || 'unknown';
  
  logger.error('Programming error', {
    requestId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  // Report to Google Cloud Error Reporting
  reportError(error, {
    userId: req.user?.id,
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      ip: req.ip
    }
  }).catch(err => {
    logger.error('Failed to report error', { error: err.message });
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: message,
    code: ERROR_CODES.INTERNAL_ERROR,
    requestId
  });
}

/**
 * Global error handler middleware
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * @returns {void}
 */
function globalErrorHandler(err, req, res, next) {
  // Set default values
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.code = err.code || ERROR_CODES.INTERNAL_ERROR;

  // Handle operational vs programming errors
  if (err.isOperational) {
    handleOperationalError(err, req, res);
  } else {
    handleProgrammingError(err, req, res);
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * 
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle unhandled promise rejections
 * 
 * @param {Error} error - Error object
 * @returns {void}
 */
function handleUnhandledRejection(error) {
  logger.error('Unhandled Promise Rejection', {
    error: error.message,
    stack: error.stack
  });

  // Report to Google Cloud
  reportError(error, {
    context: 'unhandled_rejection'
  }).catch(err => {
    logger.error('Failed to report unhandled rejection', { error: err.message });
  });

  // Graceful shutdown
  process.exit(1);
}

/**
 * Handle uncaught exceptions
 * 
 * @param {Error} error - Error object
 * @returns {void}
 */
function handleUncaughtException(error) {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  // Report to Google Cloud
  reportError(error, {
    context: 'uncaught_exception'
  }).catch(err => {
    logger.error('Failed to report uncaught exception', { error: err.message });
  });

  // Graceful shutdown
  process.exit(1);
}

// Register global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConfigurationError,
  
  // Error handlers
  globalErrorHandler,
  asyncHandler,
  handleOperationalError,
  handleProgrammingError
};
