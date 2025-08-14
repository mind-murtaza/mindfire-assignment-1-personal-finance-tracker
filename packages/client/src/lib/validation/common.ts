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

export {
	passwordSchema,
	makeNameSchema,
	objectIdSchema,
	hexColorSchema,
	categoryTypeSchema,
};

export type ObjectIdString = z.infer<typeof objectIdSchema>;
export type HexColor = z.infer<typeof hexColorSchema>;
export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type MakeName = z.infer<typeof makeNameSchema>;
