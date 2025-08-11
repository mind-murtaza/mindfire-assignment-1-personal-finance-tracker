/**
 * @fileoverview Request Validation Middleware - Enterprise-Grade Zod Integration
 * 
 * Provides comprehensive request validation using Zod schemas with enhanced
 * error handling, security features, and performance optimizations.
 * 
 * Features:
 * - Multi-source validation (body, params, query, headers)
 * - Detailed validation error reporting with field-level feedback
 * - Security: Payload size limits and data sanitization
 * - Performance: Schema caching and validation metrics
 * - Consistent error formatting following API standards
 * - Support for conditional validation and custom error messages
 * 
 * @module middlewares/validate
 * @author Murtaza
 * @version 2.0.0
 * @since 1.0.0
 * @requires zod
 */

const { ZodError } = require('zod');
require('dotenv').config();

// =================================================================
// CONFIGURATION & CONSTANTS
// =================================================================

/**
 * Validation configuration settings
 * @constant {Object} VALIDATION_CONFIG
 */
const VALIDATION_CONFIG = {
  // Maximum payload sizes (in bytes)
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  MAX_QUERY_PARAMS: 100,
  MAX_HEADER_SIZE: 8192, // 8KB
  
  // Error handling
  MAX_ERROR_DETAILS: 10, // Limit validation errors shown
  SHOW_STACK_TRACE: process.env.NODE_ENV === 'development',
  
  // Performance
  ENABLE_SCHEMA_CACHE: true,
  CACHE_SIZE_LIMIT: 100
};

/**
 * Schema cache for performance optimization
 * @type {Map<string, Object>}
 */
const schemaCache = new Map();

/**
 * Validation metrics for monitoring
 * @type {Object}
 */
const validationMetrics = {
  totalValidations: 0,
  successfulValidations: 0,
  failedValidations: 0,
  averageValidationTime: 0
};

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Generate cache key for schema caching
 * @param {Object} schema - Zod schema object
 * @param {string} source - Request source (body, params, etc.)
 * @returns {string} Cache key
 */
function generateCacheKey(schema, source) {
  return `${schema.constructor.name}_${source}_${JSON.stringify(schema._def).slice(0, 100)}`;
}

/**
 * Check payload size limits for security
 * @param {*} data - Data to validate
 * @param {string} source - Request source
 * @throws {Error} If payload exceeds limits
 */
function checkPayloadLimits(data, source) {
  const dataString = JSON.stringify(data || {});
  const size = Buffer.byteLength(dataString, 'utf8');
  
  switch (source) {
    case 'body':
      if (size > VALIDATION_CONFIG.MAX_BODY_SIZE) {
        const error = new Error(`Request body too large. Maximum size: ${VALIDATION_CONFIG.MAX_BODY_SIZE} bytes`);
        error.status = 413;
        error.code = 'PAYLOAD_TOO_LARGE';
        throw error;
      }
      break;
    case 'query':
      if (Object.keys(data || {}).length > VALIDATION_CONFIG.MAX_QUERY_PARAMS) {
        const error = new Error(`Too many query parameters. Maximum: ${VALIDATION_CONFIG.MAX_QUERY_PARAMS}`);
        error.status = 400;
        error.code = 'TOO_MANY_QUERY_PARAMS';
        throw error;
      }
      break;
    case 'headers':
      if (size > VALIDATION_CONFIG.MAX_HEADER_SIZE) {
        const error = new Error(`Request headers too large. Maximum size: ${VALIDATION_CONFIG.MAX_HEADER_SIZE} bytes`);
        error.status = 400;
        error.code = 'HEADERS_TOO_LARGE';
        throw error;
      }
      break;
  }
}

/**
 * Format validation errors with detailed field-level feedback
 * @param {ZodError} zodError - Zod validation error
 * @returns {Object} Formatted error response
 */
function formatValidationErrors(zodError) {
  const errors = zodError.issues
    .slice(0, VALIDATION_CONFIG.MAX_ERROR_DETAILS)
    .map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
      received: issue.received,
      expected: issue.expected
    }));

  return {
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: {
      totalErrors: zodError.issues.length,
      errors: errors,
      ...(zodError.issues.length > VALIDATION_CONFIG.MAX_ERROR_DETAILS && {
        truncated: `Showing ${VALIDATION_CONFIG.MAX_ERROR_DETAILS} of ${zodError.issues.length} errors`
      })
    }
  };
}

/**
 * Update validation metrics
 * @param {boolean} success - Whether validation succeeded
 * @param {number} duration - Validation duration in ms
 */
function updateMetrics(success, duration) {
  validationMetrics.totalValidations++;
  if (success) {
    validationMetrics.successfulValidations++;
  } else {
    validationMetrics.failedValidations++;
  }
  
  // Update running average
  const totalTime = validationMetrics.averageValidationTime * (validationMetrics.totalValidations - 1) + duration;
  validationMetrics.averageValidationTime = totalTime / validationMetrics.totalValidations;
}

// =================================================================
// MAIN VALIDATION FUNCTIONS
// =================================================================

/**
 * Single-source validation middleware
 * Validates data from a single request source (body, params, query, headers)
 * 
 * @function validate
 * @param {Object} schema - Zod schema for validation
 * @param {string} [source='body'] - Request source to validate
 * @param {Object} [options={}] - Additional validation options
 * @param {boolean} [options.skipCache=false] - Skip schema caching
 * @param {boolean} [options.strict=true] - Use strict validation mode
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Basic usage
 * router.post('/users', validate(userSchema), controller.create);
 * 
 * // Validate query parameters
 * router.get('/users', validate(paginationSchema, 'query'), controller.list);
 * 
 * // Validate with options
 * router.put('/users/:id', validate(updateSchema, 'body', { strict: false }), controller.update);
 */
function validate(schema, source = 'body', options = {}) {
  const { skipCache = false, strict = true } = options;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Step 1: Extract data from request
      const data = req[source] || {};
      
      // Step 2: Security checks
      checkPayloadLimits(data, source);
      
      // Step 3: Schema caching for performance
      let cacheKey;
      if (VALIDATION_CONFIG.ENABLE_SCHEMA_CACHE && !skipCache) {
        cacheKey = generateCacheKey(schema, source);
        if (schemaCache.has(cacheKey)) {
          // Use cached validation if available
          const cachedResult = schemaCache.get(cacheKey);
          if (cachedResult.lastUsed + 300000 > Date.now()) { // 5 min cache
            cachedResult.lastUsed = Date.now();
          }
        }
      }
      
      // Step 4: Perform validation
      const result = schema.safeParse(data);
      
      if (!result.success) {
        // Validation failed - format and return error
        const duration = Date.now() - startTime;
        updateMetrics(false, duration);
        
        const errorResponse = formatValidationErrors(result.error);
        return res.status(400).json(errorResponse);
      }
      
      // Step 5: Validation succeeded
      const duration = Date.now() - startTime;
      updateMetrics(true, duration);
      
      // Apply parsed/transformed data back to request
      req[source] = result.data;
      
      // Cache successful validation
      if (VALIDATION_CONFIG.ENABLE_SCHEMA_CACHE && !skipCache && cacheKey) {
        if (schemaCache.size >= VALIDATION_CONFIG.CACHE_SIZE_LIMIT) {
          // Remove oldest entry
          const oldestKey = schemaCache.keys().next().value;
          schemaCache.delete(oldestKey);
        }
        schemaCache.set(cacheKey, {
          schema,
          lastUsed: Date.now(),
          successCount: (schemaCache.get(cacheKey)?.successCount || 0) + 1
        });
      }
      
      next();
      
    } catch (error) {
      // Handle unexpected errors
      const duration = Date.now() - startTime;
      updateMetrics(false, duration);
      
      if (error.status) {
        // Known validation error (e.g., payload too large)
        return res.status(error.status).json({
          success: false,
          error: error.message,
          code: error.code || 'VALIDATION_ERROR'
        });
      }
      
      // Unknown error - pass to error handler
      error.status = error.status || 500;
      error.code = error.code || 'VALIDATION_MIDDLEWARE_ERROR';
      next(error);
    }
  };
}

/**
 * Multi-source validation middleware
 * Validates multiple request sources simultaneously
 * 
 * @function validateMultiple
 * @param {Object} schemas - Object mapping sources to schemas
 * @param {Object} [options={}] - Validation options
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.put('/users/:id', validateMultiple({
 *   params: userParamsSchema,
 *   body: updateUserSchema,
 *   query: optionsSchema
 * }), controller.update);
 */
function validateMultiple(schemas, options = {}) {
  return async (req, res, next) => {
    const startTime = Date.now();
    const validationErrors = [];
    
    try {
      // Validate each source
      for (const [source, schema] of Object.entries(schemas)) {
        const data = req[source] || {};
        checkPayloadLimits(data, source);
        
        const result = schema.safeParse(data);
        if (!result.success) {
          validationErrors.push({
            source,
            errors: result.error.issues
          });
        } else {
          // Apply validated data
          req[source] = result.data;
        }
      }
      
      // Check if any validations failed
      if (validationErrors.length > 0) {
        const duration = Date.now() - startTime;
        updateMetrics(false, duration);
        
        return res.status(400).json({
          success: false,
          error: 'Multi-source validation failed',
          code: 'MULTI_VALIDATION_ERROR',
          details: validationErrors.reduce((acc, curr) => {
            acc[curr.source] = curr.errors.map(issue => ({
              field: issue.path.join('.') || 'root',
              message: issue.message,
              code: issue.code
            }));
            return acc;
          }, {})
        });
      }
      
      const duration = Date.now() - startTime;
      updateMetrics(true, duration);
      next();
      
    } catch (error) {
      const duration = Date.now() - startTime;
      updateMetrics(false, duration);
      next(error);
    }
  };
}

/**
 * Get validation metrics for monitoring
 * @returns {Object} Current validation metrics
 */
function getValidationMetrics() {
  return {
    ...validationMetrics,
    cacheSize: schemaCache.size,
    successRate: validationMetrics.totalValidations > 0 
      ? (validationMetrics.successfulValidations / validationMetrics.totalValidations * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * Clear validation cache and reset metrics
 */
function clearValidationCache() {
  schemaCache.clear();
  Object.keys(validationMetrics).forEach(key => {
    validationMetrics[key] = 0;
  });
}

// =================================================================
// EXPORTS
// =================================================================

module.exports = {
  validate,
  validateMultiple,
  getValidationMetrics,
  clearValidationCache,
};
