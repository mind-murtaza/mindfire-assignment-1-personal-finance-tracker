const { z } = require('zod');
const {
    objectIdSchema,
    currencyAmountSchema,
    categoryTypeSchema,
    paginationSchema,
    dateRangeSchema,
} = require('./common.schema');

const transactionDescriptionSchema = z.string()
  .min(1, 'Transaction description is required')
  .max(255, 'Description cannot exceed 255 characters')
  .trim()
  .describe('Transaction description');

const transactionNotesSchema = z.string()
  .max(1000, 'Notes cannot exceed 1000 characters')
  .trim()
  .optional()
  .nullable()
  .describe('Optional transaction notes');

const transactionTagsSchema = z.array(
  z.string()
    .min(1, 'Tag cannot be empty')
    .max(20, 'Tag cannot exceed 20 characters')
    .regex(/^[a-zA-Z-]+$/, 'Tags can only contain letters and hyphens')
    .toLowerCase()
)
  .max(3, 'Cannot have more than 3 tags')
  .default([])
  .describe('Transaction tags for categorization');

const transactionDateSchema = z.date()
  .min(new Date('1900-01-01'), 'Transaction date cannot be before 1900')
  .max(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'Transaction date cannot be more than 1 year in the future')
  .describe('Transaction date');

const createTransactionSchema = z.object({
  userId: objectIdSchema,
  categoryId: objectIdSchema,
  amount: currencyAmountSchema,
  type: categoryTypeSchema,
  description: transactionDescriptionSchema,
  notes: transactionNotesSchema,
  transactionDate: transactionDateSchema,
  tags: transactionTagsSchema
}).strict()
  .refine((data) => {
    if (data.type === 'income' && data.amount < 0) {
      return false;
    }
    return true;
  }, {
    message: 'Income transactions must have positive amounts',
    path: ['amount']
  });

const updateTransactionSchema = z.object({
  categoryId: objectIdSchema.optional(),
  amount: currencyAmountSchema.optional(),
  type: categoryTypeSchema.optional(),
  description: transactionDescriptionSchema.optional(),
  notes: transactionNotesSchema,
  transactionDate: transactionDateSchema.optional(),
  tags: transactionTagsSchema.optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.date().optional().nullable()
}).strict();

const transactionFilterSchema = z.object({
  userId: objectIdSchema,
  categoryId: objectIdSchema.optional(),
  type: categoryTypeSchema.optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: dateRangeSchema.optional(),
  ...paginationSchema.shape
}).strict()
  .refine((data) => {
    if (data.minAmount && data.maxAmount) {
      return data.minAmount <= data.maxAmount;
    }
    return true;
  }, {
    message: 'Minimum amount must be less than or equal to maximum amount',
    path: ['maxAmount']
  });

module.exports = {
  transactionDescriptionSchema,
  transactionNotesSchema,
  transactionTagsSchema,
  transactionDateSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
};