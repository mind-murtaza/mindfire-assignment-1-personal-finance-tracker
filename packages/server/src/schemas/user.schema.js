const { z } = require("zod");
const {
	emailSchema,
	passwordSchema,
	currencyCodeSchema,
	nameSchema,
	emailVerificationTokenSchema,
	passwordResetTokenSchema,
	otpLoginSchema,
	strictHttpUrlSchema,
} = require("./common.schema");
const { DIAL_CODES } = require("../utils/constants/countries-dial-codes");

const userProfileSchema = z
	.object({
		firstName: nameSchema,
		lastName: nameSchema,
		avatarUrl: strictHttpUrlSchema
			.max(500, "Avatar URL cannot exceed 500 characters")
			.optional()
			.nullable(),
		mobileNumber: z
			.string()
			.regex(/^\d{10}$/, "Invalid mobile number format")
			.optional()
			.nullable(),
	})
	.strict();

const userSettingsSchema = z
	.object({
		mobileDialCode: z
			.string()
			.refine(
				(code) => DIAL_CODES.includes(code),
				"Unsupported mobile dial code"
			)
			.default("+91"),
		currency: currencyCodeSchema,
		theme: z.enum(["light", "dark", "system"]).default("system"),
	})
	.strict();

const userStatusSchema = z
	.enum(["active", "suspended", "pending_verification", "deleted"], {
		errorMap: () => ({
			message:
				"Status must be: active, suspended, pending_verification, or deleted",
		}),
	})
	.default("active");

// Authentication system schema - reuse from common.schema.js (DRY principle)
const authSystemsSchema = z
	.object({
		emailVerification: emailVerificationTokenSchema.partial().optional(),
		passwordReset: passwordResetTokenSchema.partial().optional(),
		otp: otpLoginSchema.partial().optional(),
	})
	.strict()
	.optional();

const createUserSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		profile: userProfileSchema,
		settings: userSettingsSchema.optional(),
		status: userStatusSchema.optional(),
		emailVerified: z.boolean().default(false).optional(),
		auth: authSystemsSchema,
	})
	.strict();

const updateUserSchema = z
	.object({
		profile: userProfileSchema.partial().optional(),
		settings: userSettingsSchema.partial().optional(),
		status: userStatusSchema.optional(),
		emailVerified: z.boolean().optional(),
		lastLoginAt: z.date().optional(),
		auth: authSystemsSchema,
	})
	.strict();

// =================================================================
// ROUTE-SPECIFIC SCHEMAS (minimal, reuse common schemas)
// =================================================================

/**
 * Login schema (accepts any stored password - no complexity validation)
 */
const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema, // No complexity rules for login
}).strict();

module.exports = {
	// Core user schemas
	userProfileSchema,
	userSettingsSchema,
	userStatusSchema,
	createUserSchema,
	updateUserSchema,
	authSystemsSchema,
	loginSchema,
};
