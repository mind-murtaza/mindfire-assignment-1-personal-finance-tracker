/**
 * @fileoverview Enterprise Error Handler Middleware - Comprehensive Error Management
 * 
 * Provides centralized error handling with advanced features including error classification,
 * structured logging, security filtering, request context tracking, and monitoring integration.
 * 
 * Features:
 * - Intelligent error classification and status code mapping
 * - Structured logging with request context and user information
 * - Security-aware error filtering for production environments
 * - Consistent error response formatting across all endpoints
 * - Performance monitoring and error rate tracking
 * - Integration with external monitoring services (future)
 * - Request correlation IDs for distributed tracing
 * 
 * @module middlewares/errorHandler
 * @author Murtaza
 * @version 2.0.0
 * @since 1.0.0
 * @requires crypto
 */

const crypto = require('crypto');

// =================================================================
// CONFIGURATION & CONSTANTS
// =================================================================

/**
 * Error handler configuration
 * @constant {Object} ERROR_CONFIG
 */
const ERROR_CONFIG = {
  // Environment settings
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
  
  // Logging settings
  ENABLE_CONSOLE_LOGGING: process.env.NODE_ENV !== 'test',
  ENABLE_FILE_LOGGING: process.env.ENABLE_ERROR_LOGGING === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'error',
  
  // Security settings
  EXPOSE_STACK_TRACES: process.env.NODE_ENV === 'development',
  EXPOSE_ERROR_DETAILS: process.env.NODE_ENV !== 'production',
  SANITIZE_SENSITIVE_DATA: true,
  
  // Response settings
  INCLUDE_REQUEST_ID: true,
  INCLUDE_TIMESTAMP: true,
  INCLUDE_ERROR_CODE: true,
  
  // Monitoring
  TRACK_ERROR_METRICS: true,
  MAX_ERROR_MESSAGE_LENGTH: 500
};

/**
 * Error classification mapping
 * Maps error types to appropriate HTTP status codes and categories
 * @constant {Object} ERROR_CLASSIFICATIONS
 */
const ERROR_CLASSIFICATIONS = {
  // Authentication & Authorization Errors
  'INVALID_CREDENTIALS': { status: 401, category: 'auth', severity: 'medium' },
  'TOKEN_VERIFICATION_ERROR': { status: 401, category: 'auth', severity: 'medium' },
  'TOKEN_REQUIRED': { status: 401, category: 'auth', severity: 'low' },
  'ACCOUNT_STATUS_ERROR': { status: 403, category: 'auth', severity: 'medium' },
  'USER_NOT_FOUND': { status: 401, category: 'auth', severity: 'low' },
  'MISSING_AUTH_HEADER': { status: 401, category: 'auth', severity: 'low' },
  'INVALID_AUTH_HEADER': { status: 401, category: 'auth', severity: 'low' },
  
  // Validation Errors
  'VALIDATION_ERROR': { status: 400, category: 'validation', severity: 'low' },
  'MULTI_VALIDATION_ERROR': { status: 400, category: 'validation', severity: 'low' },
  'PAYLOAD_TOO_LARGE': { status: 413, category: 'validation', severity: 'medium' },
  'TOO_MANY_QUERY_PARAMS': { status: 400, category: 'validation', severity: 'low' },
  'HEADERS_TOO_LARGE': { status: 400, category: 'validation', severity: 'medium' },
  
  // Database Errors
  'DATABASE_ERROR': { status: 500, category: 'database', severity: 'high' },
  'DUPLICATE_KEY_ERROR': { status: 409, category: 'database', severity: 'low' },
  'DOCUMENT_NOT_FOUND': { status: 404, category: 'database', severity: 'low' },
  'CONNECTION_ERROR': { status: 503, category: 'database', severity: 'critical' },
  
  // Business Logic Errors
  'BUSINESS_RULE_VIOLATION': { status: 422, category: 'business', severity: 'medium' },
  'RESOURCE_CONFLICT': { status: 409, category: 'business', severity: 'medium' },
  'INSUFFICIENT_PERMISSIONS': { status: 403, category: 'business', severity: 'medium' },
  
  // System Errors
  'RATE_LIMIT_EXCEEDED': { status: 429, category: 'system', severity: 'medium' },
  'SERVICE_UNAVAILABLE': { status: 503, category: 'system', severity: 'high' },
  'TIMEOUT_ERROR': { status: 408, category: 'system', severity: 'medium' },
  
  // External Service Errors
  'EXTERNAL_SERVICE_ERROR': { status: 502, category: 'external', severity: 'high' },
  'PAYMENT_GATEWAY_ERROR': { status: 502, category: 'external', severity: 'high' }
};

/**
 * Sensitive data patterns to sanitize from error messages
 * @constant {RegExp[]} SENSITIVE_PATTERNS
 */
const SENSITIVE_PATTERNS = [
  /password['":\s]*[^,}\s]*/gi,
  /token['":\s]*[^,}\s]*/gi,
  /secret['":\s]*[^,}\s]*/gi,
  /key['":\s]*[^,}\s]*/gi,
  /authorization['":\s]*bearer\s+[^,}\s]*/gi,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email addresses (in some contexts)
];

/**
 * Error metrics for monitoring
 * @type {Object}
 */
const errorMetrics = {
  totalErrors: 0,
  errorsByCategory: {},
  errorsBySeverity: {},
  errorsByStatus: {},
  lastErrorTime: null,
  averageResponseTime: 0
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Generate unique request correlation ID
 * @param {Object} req - Express request object
 * @returns {string} Correlation ID
 */
function generateCorrelationId(req) {
  // Use existing request ID if available, otherwise generate new one
  return req.correlationId || 
         req.headers['x-correlation-id'] || 
         crypto.randomBytes(8).toString('hex');
}

/**
 * Sanitize sensitive information from error messages and stack traces
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeSensitiveData(text) {
  if (!text || !ERROR_CONFIG.SANITIZE_SENSITIVE_DATA) return text;
  
  let sanitized = text;
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

/**
 * Classify error and determine appropriate response
 * @param {Error} error - Error object
 * @returns {Object} Error classification
 */
function classifyError(error) {
  const errorCode = error.code || error.name || 'UNKNOWN_ERROR';
  const classification = ERROR_CLASSIFICATIONS[errorCode];
  
  if (classification) {
    return {
      status: error.status || classification.status,
      category: classification.category,
      severity: classification.severity,
      code: errorCode
    };
  }
  
  // Handle common Node.js/MongoDB errors
  if (error.name === 'ValidationError') {
    return { status: 400, category: 'validation', severity: 'low', code: 'VALIDATION_ERROR' };
  }
  if (error.name === 'CastError') {
    return { status: 400, category: 'validation', severity: 'low', code: 'INVALID_ID_FORMAT' };
  }
  if (error.code === 11000) {
    return { status: 409, category: 'database', severity: 'low', code: 'DUPLICATE_KEY_ERROR' };
  }
  if (error.name === 'MongoNetworkError') {
    return { status: 503, category: 'database', severity: 'critical', code: 'DATABASE_CONNECTION_ERROR' };
  }
  
  // Default classification for unknown errors
  return {
    status: error.status || 500,
    category: 'system',
    severity: 'high',
    code: 'INTERNAL_SERVER_ERROR'
  };
}

/**
 * Extract request context for logging and debugging
 * @param {Object} req - Express request object
 * @returns {Object} Request context
 */
function extractRequestContext(req) {
  return {
    correlationId: generateCorrelationId(req),
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: req.auth?.userId || null,
    userEmail: req.auth?.email || null,
    timestamp: new Date().toISOString(),
    requestId: req.id || null
  };
}

/**
 * Log error with structured format
 * @param {Error} error - Error object
 * @param {Object} context - Request context
 * @param {Object} classification - Error classification
 */
function logError(error, context, classification) {
  if (!ERROR_CONFIG.ENABLE_CONSOLE_LOGGING) return;
  
  const logData = {
    level: 'error',
    message: sanitizeSensitiveData(error.message),
    error: {
      name: error.name,
      code: classification.code,
      category: classification.category,
      severity: classification.severity,
      status: classification.status
    },
    context,
    ...(ERROR_CONFIG.EXPOSE_STACK_TRACES && {
      stack: sanitizeSensitiveData(error.stack)
    }),
    ...(ERROR_CONFIG.EXPOSE_ERROR_DETAILS && error.details && {
      details: error.details
    })
  };
  
  // Color-coded console output for development
  if (ERROR_CONFIG.IS_DEVELOPMENT) {
    const colors = {
      low: '\x1b[33m',      // Yellow
      medium: '\x1b[35m',   // Magenta  
      high: '\x1b[31m',     // Red
      critical: '\x1b[41m'  // Red background
    };
    const reset = '\x1b[0m';
    const color = colors[classification.severity] || colors.high;
    
    console.error(`${color}[ERROR ${classification.severity.toUpperCase()}]${reset}`, JSON.stringify(logData, null, 2));
  } else {
    console.error(JSON.stringify(logData));
  }
}

/**
 * Update error metrics for monitoring
 * @param {Object} classification - Error classification
 * @param {number} responseTime - Response time in milliseconds
 */
function updateErrorMetrics(classification, responseTime) {
  if (!ERROR_CONFIG.TRACK_ERROR_METRICS) return;
  
  errorMetrics.totalErrors++;
  errorMetrics.lastErrorTime = Date.now();
  
  // Update category metrics
  errorMetrics.errorsByCategory[classification.category] = 
    (errorMetrics.errorsByCategory[classification.category] || 0) + 1;
    
  // Update severity metrics
  errorMetrics.errorsBySeverity[classification.severity] = 
    (errorMetrics.errorsBySeverity[classification.severity] || 0) + 1;
    
  // Update status metrics
  errorMetrics.errorsByStatus[classification.status] = 
    (errorMetrics.errorsByStatus[classification.status] || 0) + 1;
    
  // Update average response time
  const totalTime = errorMetrics.averageResponseTime * (errorMetrics.totalErrors - 1) + responseTime;
  errorMetrics.averageResponseTime = totalTime / errorMetrics.totalErrors;
}

/**
 * Build standardized error response
 * @param {Error} error - Error object
 * @param {Object} context - Request context
 * @param {Object} classification - Error classification
 * @returns {Object} Formatted error response
 */
function buildErrorResponse(error, context, classification) {
  const baseResponse = {
    success: false,
    error: sanitizeSensitiveData(
      error.message?.slice(0, ERROR_CONFIG.MAX_ERROR_MESSAGE_LENGTH) || 'An error occurred'
    ),
    code: classification.code
  };
  
  // Add optional fields based on configuration
  if (ERROR_CONFIG.INCLUDE_TIMESTAMP) {
    baseResponse.timestamp = context.timestamp;
  }
  
  if (ERROR_CONFIG.INCLUDE_REQUEST_ID) {
    baseResponse.correlationId = context.correlationId;
  }
  
  // Add development/debugging information
  if (ERROR_CONFIG.EXPOSE_ERROR_DETAILS) {
    if (error.details) {
      baseResponse.details = error.details;
    }
    
    if (ERROR_CONFIG.EXPOSE_STACK_TRACES && error.stack) {
      baseResponse.stack = sanitizeSensitiveData(error.stack);
    }
    
    baseResponse.context = {
      category: classification.category,
      severity: classification.severity,
      method: context.method,
      url: context.url
    };
  }
  
  return baseResponse;
}

// =================================================================
// MAIN ERROR HANDLER
// =================================================================

/**
 * Enterprise-grade error handling middleware
 * Processes all application errors with comprehensive logging, classification, and response formatting
 * 
 * @function errorHandler
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Sends JSON error response
 */
function errorHandler(err, req, res, next) {
  const startTime = Date.now();
  
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }
  
  try {
    // Step 1: Extract request context
    const context = extractRequestContext(req);
    
    // Step 2: Classify error
    const classification = classifyError(err);
    
    // Step 3: Log error with context
    logError(err, context, classification);
    
    // Step 4: Build standardized response
    const errorResponse = buildErrorResponse(err, context, classification);
    
    // Step 5: Update metrics
    const responseTime = Date.now() - startTime;
    updateErrorMetrics(classification, responseTime);
    
    // Step 6: Send response
    res.status(classification.status).json(errorResponse);
    
  } catch (handlerError) {
    // Fallback error handling if the error handler itself fails
    console.error('Error handler failed:', handlerError);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'ERROR_HANDLER_FAILURE',
      ...(ERROR_CONFIG.INCLUDE_TIMESTAMP && { timestamp: new Date().toISOString() })
    });
  }
}

/**
 * Get error metrics for monitoring dashboard
 * @returns {Object} Current error metrics
 */
function getErrorMetrics() {
  return {
    ...errorMetrics,
    uptime: process.uptime(),
    errorRate: errorMetrics.totalErrors > 0 ? 
      (errorMetrics.totalErrors / (process.uptime() / 60)).toFixed(2) + ' errors/min' : '0 errors/min'
  };
}

/**
 * Reset error metrics (useful for testing)
 */
function resetErrorMetrics() {
  Object.keys(errorMetrics).forEach(key => {
    if (typeof errorMetrics[key] === 'object') {
      errorMetrics[key] = {};
    } else {
      errorMetrics[key] = 0;
    }
  });
  errorMetrics.lastErrorTime = null;
}

// =================================================================
// EXPORTS
// =================================================================

module.exports = {
  errorHandler,
  getErrorMetrics,
  resetErrorMetrics,
  ERROR_CONFIG,
  ERROR_CLASSIFICATIONS
};

// Default export for backward compatibility
module.exports.default = errorHandler;
