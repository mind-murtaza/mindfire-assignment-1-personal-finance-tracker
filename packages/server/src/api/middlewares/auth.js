/**
 * JWT Authentication Middleware
 * 
 * Provides comprehensive JWT token validation and user authentication
 * following Agent.md's DRY principle by reusing auth.service methods.
 * 
 * Features:
 * - Token format validation with Zod schema
 * - JWT signature and expiration verification  
 * - User status validation (active/suspended/deleted)
 * - Consistent error handling with proper HTTP codes
 * - Integration with existing auth.service.js
 * 
 * @module middlewares/auth
 * @author Murtaza
 */

const { z } = require('zod');
const { verifyToken } = require('../../services/auth.service');
const { User } = require('../../models');

// =================================================================
// VALIDATION SCHEMAS
// =================================================================

/**
 * Authorization header validation schema
 * Ensures proper Bearer token format
 */
const authHeaderSchema = z
  .string()
  .regex(/^Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, {
    message: 'Invalid authorization header format. Expected: Bearer <jwt-token>'
  })
  .describe('Authorization header with Bearer token');

// =================================================================
// MIDDLEWARE FUNCTIONS
// =================================================================

/**
 * Main JWT authentication middleware
 * Validates token and attaches user info to request object
 * 
 * @async
 * @function auth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
async function auth(req, res, next) {
  try {
    // Step 1: Extract and validate authorization header format
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    // Validate header format using Zod schema
    const headerValidation = authHeaderSchema.safeParse(authHeader);
    if (!headerValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
        code: 'INVALID_AUTH_HEADER',
        details: headerValidation.error.issues[0].message
      });
    }

    // Step 2: Extract token from validated header
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Step 3: Verify JWT token using existing auth service (DRY principle)
    let payload;
    try {
      payload = verifyToken(token);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: tokenError.message,
        code: tokenError.code || 'TOKEN_VERIFICATION_ERROR'
      });
    }

    // Step 4: Fetch user and validate status
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Step 5: Check user status using existing model method (DRY principle)
    const statusInfo = user.getStatusInfo();
    if (!statusInfo.isActive) {
      return res.status(statusInfo.statusCode).json({
        success: false,
        error: `Account ${statusInfo.status}`,
        code: 'ACCOUNT_STATUS_ERROR',
        status: statusInfo.status
      });
    }

    // Step 6: Attach user info to request object
    req.auth = {
      userId: user._id.toString(),
      email: user.email,
      status: user.status
    };
    req.user = user;

    next();
  } catch (error) {
    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_MIDDLEWARE_ERROR'
    });
  }
}

/**
 * Optional authentication middleware
 * Similar to auth() but doesn't fail if no token provided
 * Useful for endpoints that work with/without authentication
 * 
 * @async
 * @function optionalAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // If no auth header, continue without user info
  if (!authHeader) {
    req.auth = null;
    req.user = null;
    return next();
  }

  // If auth header exists, validate it like regular auth
  return auth(req, res, next);
}

// =================================================================
// EXPORTS
// =================================================================

module.exports = {
  auth,
  optionalAuth,
  authHeaderSchema // Export schema for testing/reuse
};
