import { z } from "zod";

const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password cannot exceed 128 characters")
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
		"Password must contain: lowercase, uppercase, number, and special character"
	)
	.describe("User password");

const makeNameSchema = (name: string = "Name") =>
	z
		.string()
		.min(1, `${name} is required`)
		.max(50, `${name} cannot exceed 50 characters`)
		.regex(/^[a-zA-Z]+$/, `${name} can only contain letters`)
		.trim();

const objectIdSchema = z
	.string()
	.regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format")
	.describe("MongoDB ObjectId");

const hexColorSchema = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/i, "Color must be valid hex format (#RRGGBB)")
	.default("#CCCCCC")
	.describe("Hex color code");

const categoryTypeSchema = z.enum(
	["income", "expense"],
	'Category type must be either "income" or "expense"'
);

const currencyAmountSchema = z
	.number()
	.min(0.01, "Amount must be at least $0.01")
	.max(999999999.99, "Amount cannot exceed $999,999,999.99")
	.multipleOf(0.01, "Amount must have at most 2 decimal places")
	.describe("Currency amount in dollars");

const paginationSchema = z
	.object({
		page: z.number().int().min(1).default(1),
		limit: z.number().int().min(1).max(100).default(20),
		sortBy: z.string().max(50).optional(),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	})
	.strict();

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

export {
	passwordSchema,
	makeNameSchema,
	objectIdSchema,
	hexColorSchema,
	categoryTypeSchema,
	currencyAmountSchema,
	paginationSchema,
	dateRangeSchema,
};

export type ObjectIdString = z.infer<typeof objectIdSchema>;
export type HexColor = z.infer<typeof hexColorSchema>;
export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type MakeName = z.infer<typeof makeNameSchema>;
export type CurrencyAmount = z.infer<typeof currencyAmountSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
