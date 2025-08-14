import { z } from "zod";
import {
	objectIdSchema,
	hexColorSchema,
	categoryTypeSchema,
	makeNameSchema,
} from "./common";

export const categoryIconSchema = z
	.string()
	.min(1, "Icon is required")
	.max(30, "Icon name cannot exceed 30 characters")
	.regex(/^[a-z-]+$/, "Icon must be lowercase letters and hyphens only")
	.default("tag")
	.describe("Icon identifier for UI");

export const monthlyBudgetSchema = z
	.number()
	.min(0, "Monthly budget cannot be negative")
	.max(999999999.99, "Monthly budget cannot exceed 999,999,999.99")
	.multipleOf(0.01, "Budget must have at most 2 decimal places")
	.default(0)
	.describe("Monthly budget amount");

export const createCategorySchema = z
	.object({
		name: makeNameSchema("Category name"),
		type: categoryTypeSchema,
		parentId: objectIdSchema.optional().nullable(),
		color: hexColorSchema,
		icon: categoryIconSchema,
		isDefault: z.boolean().default(false),
		monthlyBudget: monthlyBudgetSchema,
	})
	.strict();

export const updateCategorySchema = z
	.object({
		name: makeNameSchema("Category name").optional(),
		color: hexColorSchema.optional(),
		icon: categoryIconSchema.optional(),
		isDefault: z.boolean().optional(),
		monthlyBudget: monthlyBudgetSchema.optional(),
	})
	.strict()
	.refine(
		(data) => Object.keys(data).length > 0,
		"At least one field is required to update"
	);

export type CategoryCreateInput = z.infer<typeof createCategorySchema>;
export type CategoryUpdateInput = z.infer<typeof updateCategorySchema>;
