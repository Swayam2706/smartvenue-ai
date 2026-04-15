/**
 * API Response Utilities
 * Standardized response formatting
 * 
 * @module utils/apiResponse
 */

/**
 * Creates success response
 * 
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success response
 */
function successResponse(data, message = 'Success') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates error response
 * 
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
function errorResponse(error, statusCode = 500) {
  return {
    success: false,
    error,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

module.exports = { successResponse, errorResponse };
