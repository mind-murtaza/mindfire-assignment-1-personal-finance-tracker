const { z } = require('zod');
const {
    objectIdSchema,
    hexColorSchema,
    categoryTypeSchema,
    nameSchema
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

// Wrap with safe messages to standardize error surfaces
const createCategorySchema = z.object({
  name: nameSchema,
  type: categoryTypeSchema,
  parentId: objectIdSchema.optional().nullable(),
  color: hexColorSchema,
  icon: categoryIconSchema,
  isDefault: z.boolean().default(false),
  monthlyBudget: monthlyBudgetSchema
}).strict().superRefine((data, ctx) => {
  // Prevent self-parenting at schema level when present
  if (data.parentId && typeof data.parentId === 'string' && data.parentId === data._id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Category cannot be its own parent', path: ['parentId'] });
  }
});

const updateCategorySchema = z.object({
  name: nameSchema.optional(),
  color: hexColorSchema.optional(),
  icon: categoryIconSchema.optional(),
  isDefault: z.boolean().optional(),
  monthlyBudget: monthlyBudgetSchema.optional(),
}).strict()
.refine((data) => Object.keys(data).length > 0, "At least one field is required to update");

// BUSINESS LOGIC VALIDATION SCHEMAS
const parentCategoryValidationSchema = z.object({
  userId: objectIdSchema,
  type: categoryTypeSchema,
  parentId: objectIdSchema,
  exists: z.boolean(),
  depth: z.number().max(2, 'Maximum 3 levels allowed (current depth + 1 would exceed limit)')
}).strict();

const categoryUniquenessSchema = z.object({
  userId: objectIdSchema,
  type: categoryTypeSchema,
  name: nameSchema,
}).strict();

module.exports = {
    // Field schemas
    categoryIconSchema,
    monthlyBudgetSchema,
    
    // Model schemas
    createCategorySchema,
    updateCategorySchema,
    
    // Business validation schemas
    parentCategoryValidationSchema,
    categoryUniquenessSchema,
};