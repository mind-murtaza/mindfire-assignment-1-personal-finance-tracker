const { z } = require("zod");
const { ObjectId } = require("mongodb");
const { CURRENCY_CODES } = require("../utils/constants/currencies");

/**
 * ObjectId validation - MongoDB ObjectId format
 */
const objectIdSchema = z
	.union([
		z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format"),
		z.instanceof(ObjectId),
	])
	.transform((val) => (typeof val === "string" ? val : val.toString()))
	.refine((val) => /^[0-9a-fA-F]{24}$/.test(val), "Invalid ObjectId format")
	.describe("MongoDB ObjectId");

/**
 * Currency amount validation - Financial precision required
 */
const currencyAmountSchema = z
	.number()
	.min(0.01, "Amount must be at least $0.01")
	.max(999999999.99, "Amount cannot exceed $999,999,999.99")
	.multipleOf(0.01, "Amount must have at most 2 decimal places")
	.describe("Currency amount in dollars");

/**
 * Email validation - RFC 5322 compliant with length limits
 */
const emailSchema = z
	.string()
	.email("Invalid email format")
	.min(5, "Email must be at least 5 characters")
	.max(254, "Email cannot exceed 254 characters")
	.toLowerCase()
	.describe("User email address");

/**
 * Password validation - Strong security requirements
 */
const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password cannot exceed 128 characters")
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
		"Password must contain: lowercase, uppercase, number, and special character"
	)
	.describe("User password");

/**
 * Name validation - Only letters
 */
const nameSchema = z
	.string()
	.min(1, "Name is required")
	.max(50, "Name cannot exceed 50 characters")
	.regex(/^[a-zA-Z]+$/, "Name can only contain letters")
	.trim();

// Safer http(s) URL validator: allows standard domains/paths, blocks XSS vectors and whitespace
const strictHttpUrlSchema = z.string().refine((value) => {
	const s = String(value);
	if (!s || /\s/.test(s)) return false; // no whitespace
	// Block HTML/script/protocol XSS vectors
	const badPatterns = [
		/<\s*\/?\s*script\b/i, // script tags
		/<[^>]+>/, // any HTML tag
		/&lt;.*?&gt;/i, // encoded tags
		/\bjavascript:/i,
		/\bdata:/i,
	];
	if (badPatterns.some((re) => re.test(s))) return false;
	try {
		const u = new URL(s);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}, "Invalid or unsafe URL");

/**
 * Currency code validation - ISO 4217 standard
 */
const currencyCodeSchema = z
	.string()
	.refine((code) => CURRENCY_CODES.includes(code), "Unsupported currency code")
	.default("INR")
	.describe("ISO 4217 currency code");

/**
 * Hex color validation - For UI colors
 */
const hexColorSchema = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be valid hex format (#RRGGBB)")
	.default("#CCCCCC")
	.describe("Hex color code");

/**
 * Category Type Validation
 */
const categoryTypeSchema = z
	.enum(["income", "expense"], 'Category type must be either "income" or "expense"');

/**
 * Pagination Schema
 */
const paginationSchema = z
	.object({
		page: z.number().int().min(1).default(1),
		limit: z.number().int().min(1).max(100).default(20),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	})
	.strict();

/**
 * Date Range Query Schema
 */
const dateRangeSchema = z
	.object({
		startDate: z.date(),
		endDate: z.date(),
	})
	.strict()
	.refine((data) => data.startDate <= data.endDate, {
		message: "Start date must be before or equal to end date",
		path: ["endDate"],
	});

/**
 * JWT Token Schema - For authentication tokens
 */
const jwtTokenSchema = z
	.string()
	.regex(
		/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/,
		"Invalid JWT token format"
	)
	.describe("JWT authentication token");

/**
 * OTP Code Schema - 6-digit numeric code
 */
const otpCodeSchema = z
	.string()
	.regex(/^\d{6}$/, "OTP code must be exactly 6 digits")
	.describe("6-digit OTP code");

/**
 * Token Expiration Schema - Future date validation
 */
const tokenExpirationSchema = z
	.date()
	.refine((date) => date > new Date(), "Token expiration must be in the future")
	.describe("Token expiration timestamp");

/**
 * Email Verification Token Schema
 */
const emailVerificationTokenSchema = z
	.object({
		token: jwtTokenSchema,
		expires: tokenExpirationSchema,
	})
	.strict();

/**
 * Password Reset Token Schema
 */
const passwordResetTokenSchema = z
	.object({
		token: jwtTokenSchema,
		expires: tokenExpirationSchema,
	})
	.strict();

/**
 * OTP Login Schema
 */
const otpLoginSchema = z
	.object({
		code: otpCodeSchema,
		expires: tokenExpirationSchema,
		attempts: z.number().int().min(0).max(5).default(0),
	})
	.strict();

// =================================================================
// ROUTE REQUEST SCHEMAS (for API endpoints)
// =================================================================

/**
 * Email verification request schema
 */
const verifyEmailRequestSchema = z
	.object({
		token: jwtTokenSchema,
	})
	.strict();

/**
 * Password reset request schema
 */
const forgotPasswordRequestSchema = z
	.object({
		email: emailSchema,
	})
	.strict();

/**
 * Password reset confirmation schema
 */
const resetPasswordRequestSchema = z
	.object({
		token: jwtTokenSchema,
		newPassword: passwordSchema,
	})
	.strict();

/**
 * OTP request schema (passwordless login)
 */
const requestOtpSchema = z
	.object({
		email: emailSchema,
	})
	.strict();

/**
 * OTP verification schema (passwordless login)
 */
const verifyOtpSchema = z
	.object({
		email: emailSchema,
		code: otpCodeSchema,
	})
	.strict();

module.exports = {
	// Core schemas
	objectIdSchema,
	currencyAmountSchema,
	emailSchema,
	passwordSchema,
	nameSchema,
	currencyCodeSchema,
	hexColorSchema,
	categoryTypeSchema,
	paginationSchema,
	dateRangeSchema,
	strictHttpUrlSchema,
	// Authentication component schemas
	jwtTokenSchema,
	otpCodeSchema,
	tokenExpirationSchema,
	emailVerificationTokenSchema,
	passwordResetTokenSchema,
	otpLoginSchema,
	// Route request schemas
	verifyEmailRequestSchema,
	forgotPasswordRequestSchema,
	resetPasswordRequestSchema,
	requestOtpSchema,
	verifyOtpSchema,
};
