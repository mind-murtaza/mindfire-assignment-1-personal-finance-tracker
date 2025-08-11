/**
 * @fileoverview Authentication Service - Secure Token Management
 * Provides comprehensive authentication operations including login,
 * token refresh, and JWT lifecycle management with enterprise-grade security.
 *
 * @module services/auth
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires bcryptjs
 * @requires jsonwebtoken
 * @requires ../models
 */

const jwt = require("jsonwebtoken");
const { User, Category } = require("../models");

// =================================================================
//                    JWT CONFIGURATION
// =================================================================

/**
 * JWT signing configuration for secure token generation
 * @constant {Object} JWT_CONFIG
 */
const JWT_CONFIG = {
	algorithm: "HS256",
	expiresIn: "30m", // 30 minutes as discussed
	issuer: "personal-finance-tracker",
	audience: "pft-users",
};

/**
 * Get JWT secret with fallback for testing
 * @function getJWTSecret
 * @returns {string} JWT secret key
 */
const getJWTSecret = () => process.env.JWT_SECRET || "test-secret";

// =================================================================
//                    TOKEN OPERATIONS
// =================================================================

/**
 * Generate JWT token for authenticated user
 * Creates a secure JWT token with user identification and metadata
 *
 * @function signToken
 * @param {Object} user - User document from database
 * @param {string} user._id - User's unique identifier
 * @param {string} user.email - User's email address
 * @returns {string} Signed JWT token
 * @throws {Error} When token generation fails
 * @example
 * const token = signToken(user);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * @since 1.0.0
 */
function signToken(user) {
	try {
		const payload = {
			sub: user._id.toString(),
			email: user.email,
			iat: Math.floor(Date.now() / 1000),
		};

		return jwt.sign(payload, getJWTSecret(), JWT_CONFIG);
	} catch (error) {
		const authError = new Error("Token generation failed");
		authError.status = 500;
		authError.code = "TOKEN_GENERATION_ERROR";
		throw authError;
	}
}

/**
 * Verify and decode JWT token
 * Validates token signature, expiration, and structure
 *
 * @function verifyToken
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} When token is invalid or expired
 * @since 1.0.0
 */
function verifyToken(token) {
	try {
		return jwt.verify(token, getJWTSecret(), {
			algorithms: [JWT_CONFIG.algorithm],
			issuer: JWT_CONFIG.issuer,
			audience: JWT_CONFIG.audience,
		});
	} catch (error) {
		const authError = new Error("Invalid or expired token");
		authError.status = 401;
		authError.code = "TOKEN_VERIFICATION_ERROR";
		throw authError;
	}
}

// =================================================================
//                    AUTHENTICATION OPERATIONS
// =================================================================

/**
 * Authenticate user with email and password
 * Performs comprehensive authentication including password verification,
 * status validation, and automatic login tracking
 *
 * @async
 * @function login
 * @param {string} email - User's email address
 * @param {string} password - User's plain text password
 * @returns {Promise<{user: Object, token: string}>} Authentication result
 * @throws {Error} When credentials are invalid or user status prevents login
 * @example
 * const result = await login('user@example.com', 'password123');
 * // Returns: { user: {...}, token: "eyJ..." }
 * @since 1.0.0
 */
async function login(email, password) {
	try {
		// Step 1: Find user using existing model method
		const user = await User.findByEmail(email);
		if (!user) {
			const error = new Error("Invalid credentials");
			error.status = 401;
			error.code = "INVALID_CREDENTIALS";
			throw error;
		}

		// Step 2: Verify password using existing model method
		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			const error = new Error("Invalid credentials");
			error.status = 401;
			error.code = "INVALID_CREDENTIALS";
			throw error;
		}

		// Step 3: Check user status using model method
		const statusInfo = user.getStatusInfo();
		if (!statusInfo.isActive) {
			const error = new Error(`Account ${statusInfo.status}`);
			error.status = statusInfo.statusCode;
			error.code = "ACCOUNT_STATUS_ERROR";
			throw error;
		}

		// Step 4: Generate token and update login timestamp
		const token = signToken(user);
		await user.updateLastLogin();

		return { user, token };
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("Authentication failed");
		authError.status = 500;
		authError.code = "AUTHENTICATION_ERROR";
		throw authError;
	}
}

/**
 * Refresh JWT token for active user
 * Validates current token and generates new token if user remains active.
 * Implements stateless token refresh with comprehensive security checks.
 *
 * @async
 * @function refresh
 * @param {string} currentToken - Current valid JWT token
 * @returns {Promise<{user: Object, token: string}>} Refresh result with new token
 * @throws {Error} When token is invalid or user status prevents refresh
 * @example
 * const result = await refresh('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * // Returns: { user: {...}, token: "eyJ..." }
 * @since 1.0.0
 */
async function refresh(currentToken) {
	try {
		// Step 1: Verify current token (throws if invalid/expired)
		const payload = verifyToken(currentToken);

		// Step 2: Fetch user from database
		const user = await User.findById(payload.sub);
		if (!user) {
			const error = new Error("User not found");
			error.status = 401;
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		// Step 3: Validate user status using model method
		const statusInfo = user.getStatusInfo();
		if (!statusInfo.isActive) {
			const error = new Error(`Account ${statusInfo.status}`);
			error.status = statusInfo.statusCode;
			error.code = "ACCOUNT_STATUS_ERROR";
			throw error;
		}

		// Step 4: Generate new token and update login timestamp
		const newToken = signToken(user);
		await user.updateLastLogin();

		return { user, token: newToken };
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("Token refresh failed");
		authError.status = 500;
		authError.code = "TOKEN_REFRESH_ERROR";
		throw authError;
	}
}

/**
 * Register new user account
 * Creates new user with validation, default categories, and immediate authentication
 *
 * @async
 * @function register
 * @param {Object} userData - User registration data
 * @returns {Promise<{user: Object, token: string}>} Registration result
 * @throws {Error} When registration fails or validation errors occur
 * @since 1.0.0
 */
async function register(userData) {
	try {
		// Step 1: Create user (model handles validation via Zod)
		const user = new User(userData);
		await user.save();

		// Step 2: Create default categories (non-fatal if fails)
		try {
			await Category.createDefaultCategories(user._id);
		} catch (categoryError) {
			// Log warning but don't fail registration
			if (process.env.NODE_ENV !== "test") {
				console.warn(
					"Failed to create default categories:",
					categoryError.message
				);
			}
		}

		// Step 3: Generate token and update login timestamp
		const token = signToken(user);
		await user.updateLastLogin();

		return { user, token };
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("Registration failed");
		authError.status = 500;
		authError.code = "REGISTRATION_ERROR";
		throw authError;
	}
}

// =================================================================
//                    MODULE EXPORTS
// =================================================================

module.exports = {
	login,
	refresh,
	register,
	signToken,
	verifyToken,
};
