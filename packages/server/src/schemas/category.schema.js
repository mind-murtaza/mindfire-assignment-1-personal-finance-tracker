const { z } = require('zod');
const {
    objectIdSchema,
    hexColorSchema,
    categoryTypeSchema,
} = require('./common.schema');

const categoryIconSchema = z.string()
  .min(1, 'Icon is required')
  .max(30, 'Icon name cannot exceed 30 characters')
  .regex(/^[a-z-]+$/, 'Icon must be lowercase letters and hyphens only')
  .default('tag')
  .describe('Icon identifier for UI');

const monthlyBudgetSchema = z.number()
  .min(0, 'Monthly budget cannot be negative')
  .max(999999999.99, 'Monthly budget cannot exceed 999,999,999.99')
  .multipleOf(0.01, 'Budget must have at most 2 decimal places')
  .default(0)
  .describe('Monthly budget amount');

const createCategorySchema = z.object({
  userId: objectIdSchema,
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters')
    .trim(),
  type: categoryTypeSchema,
  parentId: objectIdSchema.optional().nullable(),
  color: hexColorSchema,
  icon: categoryIconSchema,
  isDefault: z.boolean().default(false),
  monthlyBudget: monthlyBudgetSchema
}).strict();

// UPDATE SCHEMA - Only allow safe field updates
const updateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters')
    .trim()
    .optional(),
  color: hexColorSchema.optional(),
  icon: categoryIconSchema.optional(),
  isDefault: z.boolean().optional(),
  monthlyBudget: monthlyBudgetSchema.optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.date().optional().nullable()
}).strict();
// REMOVED: type, parentId, userId - These are forbidden updates

module.exports = {
    categoryIconSchema,
    monthlyBudgetSchema,
    createCategorySchema,
    updateCategorySchema,
};