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
		res.status(result.statusCode || 201).json(result);
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
//                    EMAIL VERIFICATION ENDPOINTS
// =================================================================

/**
 * Handle email verification
 * Verifies user email using JWT token and activates account
 *
 * @async
 * @function verifyEmail
 * @param {Object} req - Express request object
 * @param {Object} req.body - Verification data (validated by middleware)
 * @param {string} req.body.token - JWT verification token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with verification result
 * @since 1.0.0
 */
const verifyEmail = async (req, res, next) => {
	try {
		const result = await authService.verifyEmail(req.body.token);
		res.status(result.statusCode || 200).json(result);
	} catch (err) {
		next(err);
	}
};

// =================================================================
//                    PASSWORD RESET ENDPOINTS
// =================================================================

/**
 * Handle forgot password request
 * Initiates password reset process by sending reset email
 *
 * @async
 * @function forgotPassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Forgot password data (validated by middleware)
 * @param {string} req.body.email - User email address
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with operation result
 * @since 1.0.0
 */
const forgotPassword = async (req, res, next) => {
	try {
		const result = await authService.forgotPassword(req.body.email);
		res.status(result.statusCode || 200).json(result);
	} catch (err) {
		next(err);
	}
};

/**
 * Handle password reset
 * Resets user password using JWT token
 *
 * @async
 * @function resetPassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Reset password data (validated by middleware)
 * @param {string} req.body.token - JWT reset token
 * @param {string} req.body.newPassword - New password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with reset result
 * @since 1.0.0
 */
const resetPassword = async (req, res, next) => {
	try {
		const result = await authService.resetPassword(req.body.token, req.body.newPassword);
		res.status(result.statusCode || 200).json(result);
	} catch (err) {
		next(err);
	}
};

// =================================================================
//                    OTP AUTHENTICATION ENDPOINTS
// =================================================================

/**
 * Handle OTP request for passwordless login
 * Generates and sends OTP code via email
 *
 * @async
 * @function requestOtp
 * @param {Object} req - Express request object
 * @param {Object} req.body - OTP request data (validated by middleware)
 * @param {string} req.body.email - User email address
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with OTP request result
 * @since 1.0.0
 */
const requestOtp = async (req, res, next) => {
	try {
		const result = await authService.requestOtp(req.body.email);
		res.status(result.statusCode || 200).json(result);
	} catch (err) {
		next(err);
	}
};

/**
 * Handle OTP verification and login
 * Verifies OTP code and authenticates user
 *
 * @async
 * @function verifyOtp
 * @param {Object} req - Express request object
 * @param {Object} req.body - OTP verification data (validated by middleware)
 * @param {string} req.body.email - User email address
 * @param {string} req.body.code - 6-digit OTP code
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with authentication result
 * @since 1.0.0
 */
const verifyOtp = async (req, res, next) => {
	try {
		const result = await authService.verifyOtp(req.body.email, req.body.code);
		res.json({
			success: true,
			data: result,
			message: "OTP verified successfully",
		});
	} catch (err) {
		next(err);
	}
};

// =================================================================
//                    MODULE EXPORTS
// =================================================================

module.exports = {
	// Core authentication
	register,
	login,
	refresh,
	
	// Email verification
	verifyEmail,
	
	// Password reset
	forgotPassword,
	resetPassword,
	
	// OTP authentication
	requestOtp,
	verifyOtp,
};
