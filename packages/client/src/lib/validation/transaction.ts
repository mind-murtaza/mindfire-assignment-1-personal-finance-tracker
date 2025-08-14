import { z } from "zod";
import {
	objectIdSchema,
	currencyAmountSchema,
	categoryTypeSchema,
	paginationSchema,
} from "./common";

const transactionDescriptionSchema = z
	.string()
	.min(1, "Transaction description is required")
	.max(255, "Description cannot exceed 255 characters")
	.trim()
	.describe("Transaction description");

const transactionNotesSchema = z
	.string()
	.max(1000, "Notes cannot exceed 1000 characters")
	.trim()
	.optional()
	.nullable()
	.describe("Optional transaction notes");

const transactionTagsSchema = z
	.array(
		z
			.string()
			.min(1, "Tag cannot be empty")
			.max(20, "Tag cannot exceed 20 characters")
			.regex(/^[a-zA-Z-]+$/, "Tags can only contain letters and hyphens")
			.toLowerCase()
	)
	.max(3, "Cannot have more than 3 tags")
	.default([])
	.describe("Transaction tags for categorization");

const transactionDateSchema = z
	.coerce.date()
	.min(new Date("1900-01-01"), "Transaction date cannot be before 1900")
	.max(
		new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		"Transaction date cannot be more than 1 year in the future"
	)
	.describe("Transaction date");

export const createTransactionSchema = z
	.object({
		categoryId: objectIdSchema,
		amount: currencyAmountSchema,
		type: categoryTypeSchema,
		description: transactionDescriptionSchema,
		notes: transactionNotesSchema,
		transactionDate: transactionDateSchema,
		tags: transactionTagsSchema,
	})
	.strict()
	.refine(
		(data) => {
			if (data.type === "income" && data.amount < 0) {
				return false;
			}
			return true;
		},
		{
			message: "Income transactions must have positive amounts",
			path: ["amount"],
		}
	);

export const updateTransactionSchema = z
	.object({
		categoryId: objectIdSchema.optional(),
		amount: currencyAmountSchema.optional(),
		type: categoryTypeSchema.optional(),
		description: transactionDescriptionSchema.optional(),
		notes: transactionNotesSchema,
		transactionDate: transactionDateSchema.optional(),
		tags: transactionTagsSchema.optional(),
	})
	.strict();

export const transactionFilterSchema = z
	.object({
		categoryId: objectIdSchema.optional(),
		type: categoryTypeSchema.optional(),
		minAmount: z.number().min(0).optional(),
		maxAmount: z.number().min(0).optional(),
		tags: z.array(z.string()).optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		...paginationSchema.shape,
	})
	.strict()
	.refine(
		(data) => {
			if (data.minAmount && data.maxAmount) {
				return data.minAmount <= data.maxAmount;
			}
			return true;
		},
		{
			message: "Minimum amount must be less than or equal to maximum amount",
			path: ["maxAmount"],
		}
	);

// API Query schemas (for URL params)
export const transactionListQuerySchema = z
	.object({
		categoryId: objectIdSchema.optional(),
		type: z.enum(["income", "expense"]).optional(),
		minAmount: z
			.string()
			.transform(Number)
			.pipe(z.number().min(0))
			.optional(),
		maxAmount: z
			.string()
			.transform(Number)
			.pipe(z.number().min(0))
			.optional(),
		tags: z
			.string()
			.transform((str) => str.split(","))
			.pipe(z.array(z.string()))
			.optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		page: z
			.string()
			.transform(Number)
			.pipe(z.number().int().min(1))
			.default(1),
		limit: z
			.string()
			.transform(Number)
			.pipe(z.number().int().min(1).max(100))
			.default(20),
		sortBy: z.string().max(50).default("transactionDate"),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	})
	.strict();

export const transactionSummaryQuerySchema = z
	.object({
		year: z
			.string()
			.transform(Number)
			.pipe(z.number().int().min(1900))
			.optional(),
		month: z
			.string()
			.transform(Number)
			.pipe(z.number().int().min(1).max(12))
			.optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
	})
	.strict();

export const transactionBreakdownQuerySchema = z
	.object({
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
		type: z.enum(["income", "expense"]).optional(),
	})
	.strict();

export const transactionCloneOverridesSchema = z
	.object({
		amount: z.number().min(0.01).optional(),
		description: z.string().min(1).max(255).trim().optional(),
		transactionDate: z.coerce.date().optional(),
		categoryId: objectIdSchema.optional(),
	})
	.strict();

export type TransactionCreateInput = z.infer<typeof createTransactionSchema>;
export type TransactionUpdateInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type TransactionSummaryQuery = z.infer<typeof transactionSummaryQuerySchema>;
export type TransactionBreakdownQuery = z.infer<typeof transactionBreakdownQuerySchema>;
export type TransactionCloneOverrides = z.infer<typeof transactionCloneOverridesSchema>;
