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
const crypto = require("crypto");
const { User, Category } = require("../models");
const { sendPasswordReset, sendOTPCode, sendEmailVerification, sendWelcomeEmail } = require("../utils/email/emailService");

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
 * Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 * Returns: { user: {...}, token: "eyJ..." }
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
 * Returns: { user: {...}, token: "eyJ..." }
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
		const findUser = await User.findOne({ email: userData.email });
		if (findUser) {
			const error = new Error("User already exists");
			error.status = 400;
			error.code = "USER_ALREADY_EXISTS";
			throw error;
		}
		const user = new User(userData);
		await user.save();

		// Step 1.5: Generate and store email verification token (non-blocking)
		const tokenData = generateEmailVerificationToken(user);
		user.auth.emailVerification.token = tokenData.token;
		user.auth.emailVerification.expires = tokenData.expires;
		await user.save();

		// Step 1.6: Send verification email in background (non-blocking)
		setImmediate(async () => {
			try {
				await sendEmailVerification(user.email, tokenData.token, user.getFullName() || "User");
			} catch (emailError) {
				// Log email error but don't fail registration
				console.error("Background email verification failed:", emailError.message);
			}
		});

		// Step 2: Create default categories (non-fatal if fails)
		setImmediate(async () => {
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
		});

		return {
			success: true,
			message: "Registration successful, please check your email for verification",
			statusCode: 201,
		};
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
//                    EMAIL VERIFICATION OPERATIONS
// =================================================================

/**
 * Generate secure JWT token for email verification
 * Creates a JWT token with user ID and email for verification purposes
 *
 * @function generateEmailVerificationToken
 * @param {Object} user - User document from database
 * @param {string} user._id - User's unique identifier
 * @param {string} user.email - User's email address
 * @returns {Object} Token object with JWT and expiration
 * @returns {string} return.token - JWT token for email verification
 * @returns {Date} return.expires - Token expiration timestamp
 * @throws {Error} When token generation fails
 * @example
 * const tokenData = generateEmailVerificationToken(user);
 * Returns: { token: "eyJ...", expires: Date }
 * @since 1.0.0
 */
function generateEmailVerificationToken(user) {
	try {
		const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		const payload = {
			sub: user._id.toString(),
			email: user.email,
			type: "email_verification",
			exp: Math.floor(expires.getTime() / 1000),
			iat: Math.floor(Date.now() / 1000),
		};

		const token = jwt.sign(payload, getJWTSecret(), {
			algorithm: JWT_CONFIG.algorithm,
			issuer: JWT_CONFIG.issuer,
			audience: JWT_CONFIG.audience,
		});

		return { token, expires };
	} catch (error) {
		const authError = new Error("Email verification token generation failed");
		authError.status = 500;
		authError.code = "EMAIL_VERIFICATION_TOKEN_ERROR";
		throw authError;
	}
}

/**
 * Verify email address using JWT token
 * Validates token, marks email as verified, and clears verification data
 *
 * @async
 * @function verifyEmail
 * @param {string} token - JWT verification token
 * @returns {Promise<Object>} Verification result with user data
 * @returns {boolean} return.success - Verification success status
 * @returns {Object} return.user - Updated user document
 * @returns {string} return.message - Success message
 * @throws {Error} When token is invalid, expired, or user not found
 * @example
 * const result = await verifyEmail('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 *  Returns: { success: true, user: {...}, message: "Email verified successfully" }
 * @since 1.0.0
 */
async function verifyEmail(token) {
	try {
		// Step 1: Verify and decode token
		const payload = jwt.verify(token, getJWTSecret(), {
			algorithms: [JWT_CONFIG.algorithm],
			issuer: JWT_CONFIG.issuer,
			audience: JWT_CONFIG.audience,
		});

		// Step 2: Validate token type
		if (payload.type !== "email_verification") {
			const error = new Error("Invalid token type");
			error.status = 400;
			error.code = "INVALID_TOKEN_TYPE";
			throw error;
		}

		// Step 3: Find user and check token match
		const user = await User.findById(payload.sub).select("+auth.emailVerification.token +auth.emailVerification.expires +emailVerified");
		if (!user) {
			const error = new Error("User not found");
			error.status = 404;
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		// Step 4: Verify stored token matches
		if (user.auth.emailVerification.token !== token) {
			const error = new Error("Invalid verification token");
			error.status = 400;
			error.code = "INVALID_VERIFICATION_TOKEN";
			throw error;
		}

		// Step 5: Check token expiration
		if (new Date() > user.auth.emailVerification.expires) {
			const error = new Error("Verification token expired");
			error.status = 400;
			error.code = "TOKEN_EXPIRED";
			throw error;
		}

		// Step 6: Update user - mark email as verified and clear verification data
		user.emailVerified = true;
		user.status = "active"; // Activate account upon email verification
		user.auth.emailVerification.token = null;
		user.auth.emailVerification.expires = null;
		await user.save();

		setImmediate(async () => {
			try {
				await sendWelcomeEmail(user.email, user.getFullName() || "User");
			} catch (emailError) {
				// Log email error but don't fail verification
				console.error("Background welcome email failed:", emailError.message);
			}
		});

		return {
			success: true,
			message: "Email verified successfully, you can now login to your account",
		};
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("Email verification failed");
		authError.status = 500;
		authError.code = "EMAIL_VERIFICATION_ERROR";
		throw authError;
	}
}

// =================================================================
//                    PASSWORD RESET OPERATIONS
// =================================================================

/**
 * Generate secure JWT token for password reset
 * Creates a JWT token with user ID and email for password reset purposes
 *
 * @function generatePasswordResetToken
 * @param {Object} user - User document from database
 * @param {string} user._id - User's unique identifier
 * @param {string} user.email - User's email address
 * @returns {Object} Token object with JWT and expiration
 * @returns {string} return.token - JWT token for password reset
 * @returns {Date} return.expires - Token expiration timestamp
 * @throws {Error} When token generation fails
 * @example
 * const tokenData = generatePasswordResetToken(user);
 * Returns: { token: "eyJ...", expires: Date }
 * @since 1.0.0
 */
function generatePasswordResetToken(user) {
	try {
		const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
		const payload = {
			sub: user._id.toString(),
			email: user.email,
			type: "password_reset",
			exp: Math.floor(expires.getTime() / 1000),
			iat: Math.floor(Date.now() / 1000),
		};

		const token = jwt.sign(payload, getJWTSecret(), {
			algorithm: JWT_CONFIG.algorithm,
			issuer: JWT_CONFIG.issuer,
			audience: JWT_CONFIG.audience,
		});

		return { token, expires };
	} catch (error) {
		const authError = new Error("Password reset token generation failed");
		authError.status = 500;
		authError.code = "PASSWORD_RESET_TOKEN_ERROR";
		throw authError;
	}
}

/**
 * Initiate password reset process
 * Generates reset token, stores it, and sends reset email to user
 *
 * @async
 * @function forgotPassword
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Password reset initiation result
 * @returns {boolean} return.success - Operation success status
 * @returns {string} return.message - Success message
 * @throws {Error} When user not found or email sending fails
 * @example
 * const result = await forgotPassword('user@example.com');
 * Returns: { success: true, message: "Password reset email sent" }
 * @since 1.0.0
 */
async function forgotPassword(email) {
	try {
		// Step 1: Find user by email
		const user = await User.findByEmail(email);
		if (!user) {
			// Return success even if user not found (security best practice)
			return {
				success: true,
				message: "If the email exists, a password reset link has been sent",
			};
		}

		// Step 2: Check user status
		const statusInfo = user.getStatusInfo();
		if (statusInfo.status === "deleted") {
			return {
				success: true,
				message: "If the email exists, a password reset link has been sent",
			};
		}

		// Step 3: Generate password reset token
		const tokenData = generatePasswordResetToken(user);

		// Step 4: Store token in database
		user.auth.passwordReset.token = tokenData.token;
		user.auth.passwordReset.expires = tokenData.expires;
		await user.save();

		// Step 5: Send password reset email
		await sendPasswordReset(user.email, tokenData.token, user.getFullName() || "User");

		return {
			success: true,
			message: "Password reset email sent successfully",
		};
	} catch (error) {
		// Log error but don't expose details to user
		console.error("Password reset error:", error.message);

		const authError = new Error("Password reset request failed");
		authError.status = 500;
		authError.code = "PASSWORD_RESET_REQUEST_ERROR";
		throw authError;
	}
}

/**
 * Reset user password using JWT token
 * Validates token, updates password, and clears reset data
 *
 * @async
 * @function resetPassword
 * @param {string} token - JWT password reset token
 * @param {string} newPassword - New password (will be hashed by model)
 * @returns {Promise<Object>} Password reset result
 * @returns {boolean} return.success - Reset success status
 * @returns {string} return.message - Success message
 * @throws {Error} When token is invalid, expired, or password update fails
 * @example
 * const result = await resetPassword('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 'newSecurePassword123');
 * Returns: { success: true, message: "Password reset successfully" }
 * @since 1.0.0
 */
async function resetPassword(token, newPassword) {
	try {
		// Step 1: Verify and decode token
		const payload = jwt.verify(token, getJWTSecret(), {
			algorithms: [JWT_CONFIG.algorithm],
			issuer: JWT_CONFIG.issuer,
			audience: JWT_CONFIG.audience,
		});

		// Step 2: Validate token type
		if (payload.type !== "password_reset") {
			const error = new Error("Invalid token type");
			error.status = 400;
			error.code = "INVALID_TOKEN_TYPE";
			throw error;
		}

		// Step 3: Find user and check token match
		const user = await User.findById(payload.sub).select("+auth.passwordReset.token +auth.passwordReset.expires");
		if (!user) {
			const error = new Error("User not found");
			error.status = 404;
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		// Step 4: Verify stored token matches
		if (user.auth.passwordReset.token !== token) {
			const error = new Error("Invalid reset token");
			error.status = 400;
			error.code = "INVALID_RESET_TOKEN";
			throw error;
		}

		// Step 5: Check token expiration
		if (new Date() > user.auth.passwordReset.expires) {
			const error = new Error("Reset token expired");
			error.status = 400;
			error.code = "TOKEN_EXPIRED";
			throw error;
		}

		// Step 6: Update password and clear reset data
		await user.updatePassword(newPassword); // Uses model method with hashing
		user.auth.passwordReset.token = null;
		user.auth.passwordReset.expires = null;
		await user.save();

		return {
			success: true,
			message: "Password reset successfully",
		};
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("Password reset failed");
		authError.status = 500;
		authError.code = "PASSWORD_RESET_ERROR";
		throw authError;
	}
}

// =================================================================
//                    OTP AUTHENTICATION OPERATIONS
// =================================================================

/**
 * Generate secure 6-digit OTP code
 * Creates a cryptographically secure 6-digit numeric code
 *
 * @function generateOTPCode
 * @returns {Object} OTP object with code and expiration
 * @returns {string} return.code - 6-digit OTP code
 * @returns {Date} return.expires - OTP expiration timestamp (10 minutes)
 * @throws {Error} When OTP generation fails
 * @example
 * const otpData = generateOTPCode();
 * Returns: { code: "123456", expires: Date }
 * @since 1.0.0
 */
function generateOTPCode() {
	try {
		// Generate cryptographically secure 6-digit code
		const code = crypto.randomInt(100000, 999999).toString();
		const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		return { code, expires };
	} catch (error) {
		const authError = new Error("OTP code generation failed");
		authError.status = 500;
		authError.code = "OTP_GENERATION_ERROR";
		throw authError;
	}
}

/**
 * Request OTP code for passwordless login
 * Generates OTP, stores it, and sends via email to user
 *
 * @async
 * @function requestOtp
 * @param {string} email - User's email address
 * @returns {Promise<Object>} OTP request result
 * @returns {boolean} return.success - Operation success status
 * @returns {string} return.message - Success message
 * @throws {Error} When user not found or email sending fails
 * @example
 * const result = await requestOtp('user@example.com');
 * Returns: { success: true, message: "OTP sent to email" }
 * @since 1.0.0
 */
async function requestOtp(email) {
	try {
		// Step 1: Find user by email
		const user = await User.findByEmail(email);
		if (!user) {
			const error = new Error("User not found");
			error.status = 404;
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		// Step 2: Check user status
		const statusInfo = user.getStatusInfo();
		if (statusInfo.status === "deleted") {
			const error = new Error("Account not found");
			error.status = 404;
			error.code = "ACCOUNT_NOT_FOUND";
			throw error;
		}

		// Step 3: Generate OTP code
		const otpData = generateOTPCode();

		// Step 4: Store OTP in database and reset attempts
		user.auth.otp.code = otpData.code;
		user.auth.otp.expires = otpData.expires;
		user.auth.otp.attempts = 0; // Reset attempts counter
		await user.save();

		// Step 5: Send OTP email
		await sendOTPCode(user.email, otpData.code, user.getFullName() || "User");

		return {
			success: true,
			message: "OTP sent to your email address",
		};
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("OTP request failed");
		authError.status = 500;
		authError.code = "OTP_REQUEST_ERROR";
		throw authError;
	}
}

/**
 * Verify OTP code and authenticate user
 * Validates OTP, handles attempt limits, and logs user in
 *
 * @async
 * @function verifyOtp
 * @param {string} email - User's email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<{user: Object, token: string}>} Authentication result
 * @returns {Object} return.user - User document
 * @returns {string} return.token - JWT authentication token
 * @throws {Error} When OTP is invalid, expired, or max attempts reached
 * @example
 * const result = await verifyOtp('user@example.com', '123456');
 * Returns: { user: {...}, token: "eyJ..." }
 * @since 1.0.0
 */
async function verifyOtp(email, code) {
	try {
		// Step 1: Find user with OTP data
		const user = await User.findByEmail(email).select("+auth.otp.code +auth.otp.expires +auth.otp.attempts");
		if (!user) {
			const error = new Error("User not found");
			error.status = 404;
			error.code = "USER_NOT_FOUND";
			throw error;
		}

		// Step 2: Check if OTP exists
		if (!user.auth.otp.code) {
			const error = new Error("No OTP request found");
			error.status = 400;
			error.code = "NO_OTP_REQUEST";
			throw error;
		}

		// Step 3: Check OTP expiration
		if (new Date() > user.auth.otp.expires) {
			// Clear expired OTP
			user.auth.otp.code = null;
			user.auth.otp.expires = null;
			user.auth.otp.attempts = 0;
			await user.save();

			const error = new Error("OTP expired");
			error.status = 400;
			error.code = "OTP_EXPIRED";
			throw error;
		}

		// Step 4: Check attempt limits
		if (user.auth.otp.attempts >= 5) {
			// Clear OTP after max attempts
			user.auth.otp.code = null;
			user.auth.otp.expires = null;
			user.auth.otp.attempts = 0;
			await user.save();

			const error = new Error("Maximum OTP attempts exceeded");
			error.status = 429;
			error.code = "MAX_OTP_ATTEMPTS";
			throw error;
		}

		// Step 5: Verify OTP code
		if (user.auth.otp.code !== code) {
			// Increment failed attempts
			user.auth.otp.attempts += 1;
			await user.save();

			const error = new Error("Invalid OTP code");
			error.status = 400;
			error.code = "INVALID_OTP";
			throw error;
		}

		// Step 6: Check user status
		const statusInfo = user.getStatusInfo();
		if (!statusInfo.isActive) {
			const error = new Error(`Account ${statusInfo.status}`);
			error.status = statusInfo.statusCode;
			error.code = "ACCOUNT_STATUS_ERROR";
			throw error;
		}

		// Step 7: Clear OTP and generate auth token
		user.auth.otp.code = null;
		user.auth.otp.expires = null;
		user.auth.otp.attempts = 0;
		await user.save();

		// Step 8: Generate authentication token and update login timestamp
		const token = signToken(user);
		await user.updateLastLogin();

		return { user, token };
	} catch (error) {
		// Re-throw with proper error context
		if (error.status) {
			throw error;
		}

		const authError = new Error("OTP verification failed");
		authError.status = 500;
		authError.code = "OTP_VERIFICATION_ERROR";
		throw authError;
	}
}

// =================================================================
//                    MODULE EXPORTS
// =================================================================

module.exports = {
	// Core authentication
	login,
	refresh,
	register,
	signToken,
	verifyToken,
	
	// Email verification
	generateEmailVerificationToken,
	verifyEmail,
	
	// Password reset
	generatePasswordResetToken,
	forgotPassword,
	resetPassword,
	
	// OTP authentication
	generateOTPCode,
	requestOtp,
	verifyOtp,
};
