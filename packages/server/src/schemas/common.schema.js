const { z } = require("zod");
const { CURRENCY_CODES } = require("../constants/currencies");
/**
 * ObjectId validation - MongoDB ObjectId format
 */
const objectIdSchema = z
	.string()
	.regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format")
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
const categoryTypeSchema = z.enum(["income", "expense"], {
	errorMap: () => ({
		message: 'Category type must be either "income" or "expense"',
	}),
});

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

module.exports = {
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
};
