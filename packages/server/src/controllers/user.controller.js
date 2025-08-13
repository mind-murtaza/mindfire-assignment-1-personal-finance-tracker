/**
 * @fileoverview User controller handling all user-related HTTP requests.
 * This module provides secure user profile management, settings updates,
 * password changes, and account lifecycle management.
 * 
 * @module controllers/user
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires ../services/user.service
 */

const userService = require('../services/user.service');
const { sanitizeUser } = require('../utils/sanitize');

function forwardUserError(err, next) {
  // Duplicate key from Mongo
  if (err && (err.code === 11000 || err.code === 11001)) {
    err.status = err.status || 409;
    err.message = err.message || 'Duplicate resource';
    err.code = err.code || 'DUPLICATE_RESOURCE';
  }
  if (!err.status) {
    err.status = 500;
    err.code = err.code || 'USER_CONTROLLER_ERROR';
  }
  return next(err);
}

/**
 * Get current authenticated user's profile information.
 * Returns the complete user object excluding sensitive fields.
 * 
 * @function me
 * @memberof UserController
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object (populated by auth middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with user data
 * @throws {Error} Passes any errors to Express error handler
 * @example
 * GET /api/users/me
 * Response: { success: true, data: { id: "...", email: "...", profile: {...} } }
 * @since 1.0.0
 */
const me = async (req, res, next) => {
  try {
    res.json({ 
      success: true, 
      data: {
        user: sanitizeUser(req.user) 
      } 
    });
  } catch (err) {
    forwardUserError(err, next);
  }
};

/**
 * Update user's profile information (firstName, lastName, avatarUrl, mobileNumber).
 * Performs partial updates - only provided fields are updated.
 * 
 * @function updateProfile
 * @memberof UserController
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.auth - Authentication context with userId
 * @param {string} req.auth.userId - Authenticated user's ID
 * @param {Object} req.body - Profile update data (validated by middleware)
 * @param {string} [req.body.firstName] - Updated first name
 * @param {string} [req.body.lastName] - Updated last name
 * @param {string} [req.body.avatarUrl] - Updated avatar URL
 * @param {string} [req.body.mobileNumber] - Updated mobile number
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated user data
 * @throws {ValidationError} When profile data is invalid (handled by service)
 * @throws {NotFoundError} When user doesn't exist (handled by service)
 * @example
 * PATCH /api/users/me/profile
 * Body: { "firstName": "John", "lastName": "Doe" }
 * Response: { success: true, data: { ...updatedUser } }
 * @since 1.0.0
 */
const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateUserProfile(req.auth.userId, req.body);
    res.json({ 
      success: true, 
      data: updated 
    });
  } catch (err) {
    forwardUserError(err, next);
  }
};

/**
 * Update user's application settings (currency, theme, mobileDialCode).
 * Performs partial updates - only provided fields are updated.
 * 
 * @function updateSettings
 * @memberof UserController
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.auth - Authentication context with userId
 * @param {string} req.auth.userId - Authenticated user's ID
 * @param {Object} req.body - Settings update data (validated by middleware)
 * @param {string} [req.body.currency] - Updated currency code (e.g., 'USD', 'EUR')
 * @param {string} [req.body.theme] - Updated theme preference ('light', 'dark', 'system')
 * @param {string} [req.body.mobileDialCode] - Updated mobile dial code (e.g., '+1', '+91')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated user data
 * @throws {ValidationError} When settings data is invalid (handled by service)
 * @throws {NotFoundError} When user doesn't exist (handled by service)
 * @example
 * PATCH /api/users/me/settings
 * Body: { "currency": "USD", "theme": "dark" }
 * Response: { success: true, data: { ...updatedUser } }
 * @since 1.0.0
 */
const updateSettings = async (req, res, next) => {
  try {
    const updated = await userService.updateUserSettings(req.auth.userId, req.body);
    res.json({ 
      success: true, 
      data: updated 
    });
  } catch (err) {
    forwardUserError(err, next);
  }
};

/**
 * Change user's password with current password verification.
 * Requires current password for security verification before allowing change.
 * 
 * @function changePassword
 * @memberof UserController
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.auth - Authentication context with userId
 * @param {string} req.auth.userId - Authenticated user's ID
 * @param {Object} req.body - Password change data (validated by middleware)
 * @param {string} req.body.currentPassword - User's current password for verification
 * @param {string} req.body.newPassword - New password (must meet security requirements)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} JSON success response (no sensitive data)
 * @throws {ValidationError} When password data is invalid (handled by service)
 * @throws {AuthenticationError} When current password is incorrect (handled by service)
 * @throws {NotFoundError} When user doesn't exist (handled by service)
 * @example
 * POST /api/users/me/change-password
 * Body: { "currentPassword": "old123", "newPassword": "newSecure456!" }
 * Response: { success: true }
 * @since 1.0.0
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.auth.userId, currentPassword, newPassword);
    res.json({ 
      success: true 
    });
  } catch (err) {
    forwardUserError(err, next);
  }
};

/**
 * Soft delete user account (mark as deleted, don't remove from database).
 * Sets user status to 'deleted', preventing login while preserving data integrity.
 * This is a destructive operation that cannot be easily reversed.
 * 
 * @function softDelete
 * @memberof UserController
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.auth - Authentication context with userId
 * @param {string} req.auth.userId - Authenticated user's ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Empty 204 No Content response
 * @throws {NotFoundError} When user doesn't exist (handled by service)
 * @example
 * DELETE /api/users/me
 * Response: 204 No Content
 * @since 1.0.0
 */
const softDelete = async (req, res, next) => {
  try {
    await userService.softDelete(req.auth.userId);
    res.status(204).send();
  } catch (err) {
    forwardUserError(err, next);
  }
};

// =================================================================
//                    MODULE EXPORTS
// =================================================================

module.exports = {
  me,
  updateProfile,
  updateSettings,
  changePassword,
  softDelete,
};