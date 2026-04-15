/**
 * Advanced Input Validation Utilities
 * Provides comprehensive validation beyond express-validator
 * 
 * @module utils/validation
 */

/**
 * Validates string length with min/max constraints
 * 
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} Validation result
 */
function validateLength(value, min = 0, max = Infinity) {
  if (typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
}

/**
 * Validates email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} Validation result
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} Validation result
 */
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates numeric range
 * 
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} Validation result
 */
function validateRange(value, min = -Infinity, max = Infinity) {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Validates enum values
 * 
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Allowed values
 * @returns {boolean} Validation result
 */
function validateEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Sanitizes and validates zone ID
 * 
 * @param {string} zoneId - Zone ID to validate
 * @returns {boolean} Validation result
 */
function validateZoneId(zoneId) {
  if (typeof zoneId !== 'string') return false;
  // Allow alphanumeric, hyphens, underscores
  return /^[a-z0-9\-_]+$/i.test(zoneId) && zoneId.length <= 50;
}

/**
 * Validates object structure
 * 
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result with errors
 */
function validateObject(obj, schema) {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }
      
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} has invalid format`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateLength,
  validateEmail,
  validateUrl,
  validateRange,
  validateEnum,
  validateZoneId,
  validateObject
};
