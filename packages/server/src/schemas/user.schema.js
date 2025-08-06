const { z } = require("zod");
const {
	emailSchema,
	passwordSchema,
	currencyCodeSchema,
	nameSchema,
} = require("./common.schema");
const { DIAL_CODES } = require("../constants/countries-dial-codes");

const userProfileSchema = z
	.object({
		firstName: nameSchema,
		lastName: nameSchema,
		avatarUrl: z
			.string()
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
	.default("pending_verification");

const createUserSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		profile: userProfileSchema,
		settings: userSettingsSchema.optional(),
		status: userStatusSchema.optional(),
	})
	.strict();

const updateUserSchema = z
	.object({
		profile: userProfileSchema.partial().optional(),
		settings: userSettingsSchema.partial().optional(),
		status: userStatusSchema.optional(),
		lastLoginAt: z.date().optional(),
	})
	.strict();

module.exports = {
	userProfileSchema,
	userSettingsSchema,
	userStatusSchema,
	createUserSchema,
	updateUserSchema,
};
