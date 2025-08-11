/**
 * @fileoverview Authentication Controller - Clean Auth Route Handling
 * Dedicated controller for authentication operations following SOLID principles.
 * Handles all auth-related HTTP requests with proper separation of concerns.
 *
 * @module controllers/auth
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires ../services/auth.service
 */

const authService = require("../services/auth.service");

// =================================================================
//                    AUTHENTICATION ENDPOINTS
// =================================================================

/**
 * Handle user registration
 * Creates new user account with validation and immediate authentication
 *
 * @async
 * @function register
 * @param {Object} req - Express request object
 * @param {Object} req.body - Registration data (validated by middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with user data and token
 * @since 1.0.0
 */
const register = async (req, res, next) => {
	try {
		const result = await authService.register(req.body);
		res.status(201).json({
			success: true,
			data: result,
			message: "Registration successful",
		});
	} catch (err) {
		next(err);
	}
};

/**
 * Handle user login
 * Authenticates user with email and password
 *
 * @async
 * @function login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Login credentials (validated by middleware)
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with user data and token
 * @since 1.0.0
 */
const login = async (req, res, next) => {
	try {
		const result = await authService.login(req.body.email, req.body.password);
		res.json({
			success: true,
			data: result,
			message: "Login successful",
		});
	} catch (err) {
		next(err);
	}
};

/**
 * Handle token refresh
 * Issues new token for authenticated user (token validated by auth middleware)
 *
 * @async
 * @function refresh
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object (attached by auth middleware)
 * @param {Object} req.auth - Auth info (attached by auth middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with user data and new token
 * @since 1.0.0
 */
const refresh = async (req, res, next) => {
	try {
		const result = await authService.refresh(req.headers.authorization.slice(7));
		res.json({
			success: true,
			data: result,
			message: "Token refreshed successfully",
		});
	} catch (err) {
		next(err);
	}
};

// =================================================================
//                    MODULE EXPORTS
// =================================================================

module.exports = {
	register,
	login,
	refresh,
};
