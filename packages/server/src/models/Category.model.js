/**
 * Category Model - Enterprise-Grade Category Schema
 * Purpose: Stores user-defined and default categories for transactions
 * 
 * Performance Optimizations:
 * - Compound index on userId + type for fast category queries
 * - Soft delete index for active category filtering
 * - Parent-child relationship support for sub-categories (3 levels max)
 * 
 * Business Logic:
 * - Hierarchical categories (3 levels: Root → Child → Grandchild)
 * - Monthly budget tracking per category
 * - Soft delete support
 * - Default vs custom categories (one per user per type)
 * 
 * Validation Strategy:
 * - Field validation: Handled by Zod schemas in pre-save hook
 * - Business logic validation: Handled by Mongoose middleware
 * - Update restrictions: No parentId/type changes after creation
 */

const mongoose = require('mongoose');
const { createCategorySchema, updateCategorySchema } = require('../schemas');
const { Schema } = mongoose;

// =================================================================
//                    CATEGORY SCHEMA DEFINITION
// =================================================================

const CategorySchema = new Schema({
  // Owner reference
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Category identification
  name: {
    type: String,
    trim: true
  },

  // Transaction type classification
  type: {
    type: String
  },

  // Hierarchical structure support (3 levels max)
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },

  // UI customization
  color: {
    type: String,
    default: '#CCCCCC'
  },

  icon: {
    type: String,
    default: 'tag'
  },

  // System vs user categories
  isDefault: {
    type: Boolean,
    default: false
  },

  // Budget management
  monthlyBudget: {
    type: Schema.Types.Decimal128,
    default: 0.00
  },

  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date,
    default: null
  }
}, {
  // Schema options
  timestamps: true,
  collection: 'categories',
  minimize: false,
  validateBeforeSave: true,
  
  // JSON transformation
  toJSON: {
    transform: function(doc, ret) {
      if (ret.monthlyBudget) {
        ret.monthlyBudget = parseFloat(ret.monthlyBudget.toString());
      }
      delete ret.__v;
      return ret;
    }
  },

  toObject: {
    transform: function(doc, ret) {
      if (ret.monthlyBudget) {
        ret.monthlyBudget = parseFloat(ret.monthlyBudget.toString());
      }
      delete ret.__v;
      return ret;
    }
  }
});

// =================================================================
//                          INDEXES
// =================================================================

// Primary indexes for performance
CategorySchema.index({ userId: 1, type: 1 }, { background: true });
CategorySchema.index({ userId: 1, isDeleted: 1 }, { background: true });
CategorySchema.index({ parentId: 1 }, { background: true, sparse: true });
CategorySchema.index({ userId: 1, name: 1 }, { background: true });

// Compound index for category hierarchy queries
CategorySchema.index({ userId: 1, type: 1, parentId: 1 }, { background: true });

// ENTERPRISE SOLUTION: Compound unique index for default categories
// Only ONE default per user per type - enforced at database level
CategorySchema.index(
  { userId: 1, type: 1, isDefault: 1 }, 
  { 
    background: true, 
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

// =================================================================
//                      MIDDLEWARE HOOKS
// =================================================================

/**
 * Pre-save middleware for Zod validation
 * Validates all field-level constraints using Zod schemas
 */
CategorySchema.pre('save', function(next) {
  try {
    // Only validate new documents with Zod to avoid Mongoose-added fields issue
    if (this.isNew) {
      // Construct plain object for Zod validation
      const plainCategoryObject = {
        userId: this.userId,
        name: this.name,
        type: this.type,
        parentId: this.parentId,
        color: this.color,
        icon: this.icon,
        isDefault: this.isDefault,
        monthlyBudget: this.monthlyBudget ? parseFloat(this.monthlyBudget.toString()) : 0
      };

      const validation = createCategorySchema.safeParse(plainCategoryObject);
      
      if (!validation.success) {
        const error = new Error(validation.error.issues[0].message);
        error.name = 'ValidationError';
        return next(error);
      }

      // Apply Zod transformations back to document
      const { name, color, icon } = validation.data;
      this.name = name; // Zod trim transformation
      this.color = color;
      this.icon = icon;
    } else {
    const modifiedFields = {};
      
      // Only validate fields that were actually modified
      if (this.isModified('name')) modifiedFields.name = this.name;
      if (this.isModified('color')) modifiedFields.color = this.color;
      if (this.isModified('icon')) modifiedFields.icon = this.icon;
      if (this.isModified('isDefault')) modifiedFields.isDefault = this.isDefault;
      if (this.isModified('monthlyBudget')) {
        modifiedFields.monthlyBudget = this.monthlyBudget ? parseFloat(this.monthlyBudget.toString()) : 0;
      }
      if (this.isModified('isDeleted')) modifiedFields.isDeleted = this.isDeleted;
      if (this.isModified('deletedAt')) modifiedFields.deletedAt = this.deletedAt;

      // Only validate if there are actually modified fields to validate
      if (Object.keys(modifiedFields).length > 0) {
        const validation = updateCategorySchema.safeParse(modifiedFields);
        
        if (!validation.success) {
          const error = new Error(validation.error.issues[0].message);
          error.name = 'ValidationError';
          return next(error);
        }

        // Apply Zod transformations for updates
        if (validation.data.name !== undefined) this.name = validation.data.name;
        if (validation.data.color !== undefined) this.color = validation.data.color;
        if (validation.data.icon !== undefined) this.icon = validation.data.icon;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware for business logic validation
 */
CategorySchema.pre('save', async function(next) {
  try {
    // STEP 1: Handle default category logic - ENTERPRISE APPROACH
    if (this.isModified('isDefault') && this.isDefault) {
      // Unset any existing default for this user and type
      await this.constructor.updateOne(
        { 
          userId: this.userId, 
          type: this.type, 
          isDefault: true,
          _id: { $ne: this._id }
        },
        { $set: { isDefault: false } }
      );
    }

    // STEP 2: Prevent forbidden updates (SECURITY)
    if (!this.isNew) {
      if (this.isModified('parentId')) {
        const error = new Error('Cannot change parent of existing category');
        error.name = 'ValidationError';
        return next(error);
      }
      if (this.isModified('type')) {
        const error = new Error('Cannot change category type');
        error.name = 'ValidationError';
        return next(error);
      }
      if (this.isModified('userId')) {
        const error = new Error('Cannot change category owner');
        error.name = 'ValidationError';
        return next(error);
      }
    }

    // STEP 3: Validate parent-child relationship (NEW CATEGORIES ONLY)
    if (this.isNew && this.parentId) {
      const parent = await this.constructor.findById(this.parentId);
      
      if (!parent) {
        const error = new Error('Parent category not found');
        error.name = 'ValidationError';
        return next(error);
      }
      
      // Ensure parent belongs to same user
      if (!parent.userId.equals(this.userId)) {
        const error = new Error('Parent category must belong to the same user');
        error.name = 'ValidationError';
        return next(error);
      }
      
      // Ensure parent is same type
      if (parent.type !== this.type) {
        const error = new Error('Parent category must be of the same type');
        error.name = 'ValidationError';
        return next(error);
      }
      
      // MAX 3 LEVELS: Calculate parent depth
      let currentDepth = 0;
      let currentParent = parent;
      
      while (currentParent && currentParent.parentId) {
        currentDepth++;
        if (currentDepth >= 2) {
          const error = new Error('Maximum 3 levels allowed');
          error.name = 'ValidationError';
          return next(error);
        }
        currentParent = await this.constructor.findById(currentParent.parentId);
      }
    }
    
    // STEP 4: Validate category name uniqueness within user and type
    const existingCategory = await this.constructor.findOne({
      userId: this.userId,
      type: this.type,
      name: this.name,
      isDeleted: false,
      _id: { $ne: this._id }
    });
    
    if (existingCategory) {
      const error = new Error(`Category name '${this.name}' already exists for this type`);
      error.name = 'ValidationError';
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware for soft delete logic
 */
CategorySchema.pre('save', function(next) {
  // Set deletedAt timestamp when marking as deleted
  if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  
  // Clear deletedAt when undeleting
  if (this.isModified('isDeleted') && !this.isDeleted && this.deletedAt) {
    this.deletedAt = null;
  }
  
  next();
});

// =================================================================
//                      INSTANCE METHODS
// =================================================================

/**
 * Get all child categories
 * @returns {Promise<Category[]>} - Array of child categories
 */
CategorySchema.methods.getChildren = function() {
  return this.constructor.find({
    parentId: this._id,
    isDeleted: false
  }).sort({ name: 1 });
};

/**
 * Get category hierarchy path
 * @returns {Promise<string>} - Full path like "Parent > Child > Current"
 */
CategorySchema.methods.getHierarchyPath = async function() {
  const path = [];
  let current = this;
  
  while (current) {
    path.unshift(current.name);
    
    if (current.parentId) {
      current = await this.constructor.findById(current.parentId);
    } else {
      current = null;
    }
  }
  
  return path.join(' > ');
};

/**
 * Soft delete category and all children
 * @returns {Promise<void>}
 */
CategorySchema.methods.softDelete = async function() {
  // Mark this category as deleted - use updateOne to skip pre-save hooks
  const date = new Date();
  await this.constructor.updateOne(
    { _id: this._id },
    { 
      $set: { 
        isDeleted: true, 
        deletedAt: date 
      } 
    }
  );
  
  // Update local document state
  this.isDeleted = true;
  this.deletedAt = date;
  
  // Recursively delete children
  const children = await this.getChildren();
  await Promise.all(children.map(child => child.softDelete()));
};

/**
 * Get monthly budget as number
 * @returns {number} - Monthly budget amount
 */
CategorySchema.methods.getMonthlyBudgetAmount = function() {
  return parseFloat(this.monthlyBudget.toString());
};

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Find categories by user and type
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type ('income' or 'expense')
 * @param {boolean} includeDeleted - Include deleted categories
 * @returns {Promise<Category[]>} - Array of categories
 */
CategorySchema.statics.findByUserAndType = function(userId, type, includeDeleted = false) {
  const query = { userId, type };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Get category hierarchy for user
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type
 * @returns {Promise<Object>} - Hierarchical category structure
 */
CategorySchema.statics.getCategoryHierarchy = async function(userId, type) {
  const categories = await this.find({
    userId,
    type,
    isDeleted: false
  }).sort({ name: 1 });
  
  // Build hierarchy
  const categoryMap = new Map();
  const rootCategories = [];
  
  // First pass: create map
  categories.forEach(category => {
    categoryMap.set(category._id.toString(), {
      ...category.toObject(),
      children: []
    });
  });
  
  // Second pass: build hierarchy
  categories.forEach(category => {
    const categoryObj = categoryMap.get(category._id.toString());
    
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId.toString());
      if (parent) {
        parent.children.push(categoryObj);
      } else {
        // Parent not found, treat as root
        rootCategories.push(categoryObj);
      }
    } else {
      rootCategories.push(categoryObj);
    }
  });
  
  return rootCategories;
};

/**
 * Create default categories for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Category[]>} - Created default categories
 */
CategorySchema.statics.createDefaultCategories = async function(userId) {
  const defaultCategories = [
    // Income categories - Only "Salary" is default
    { name: 'Salary', type: 'income', color: '#4CAF50', icon: 'briefcase', isDefault: true },
    { name: 'Freelance', type: 'income', color: '#2196F3', icon: 'laptop', isDefault: false },
    { name: 'Investment', type: 'income', color: '#FF9800', icon: 'trending-up', isDefault: false },
    { name: 'Other Income', type: 'income', color: '#9C27B0', icon: 'plus-circle', isDefault: false },
    
    // Expense categories - Only "Food & Dining" is default
    { name: 'Food & Dining', type: 'expense', color: '#F44336', icon: 'utensils', isDefault: true },
    { name: 'Transportation', type: 'expense', color: '#3F51B5', icon: 'car', isDefault: false },
    { name: 'Shopping', type: 'expense', color: '#E91E63', icon: 'shopping-bag', isDefault: false },
    { name: 'Entertainment', type: 'expense', color: '#9C27B0', icon: 'film', isDefault: false },
    { name: 'Bills & Utilities', type: 'expense', color: '#607D8B', icon: 'file-text', isDefault: false },
    { name: 'Healthcare', type: 'expense', color: '#4CAF50', icon: 'heart', isDefault: false },
    { name: 'Education', type: 'expense', color: '#FF9800', icon: 'book', isDefault: false },
    { name: 'Other Expenses', type: 'expense', color: '#795548', icon: 'more-horizontal', isDefault: false }
  ];
  
  const categories = defaultCategories.map(cat => ({
    ...cat,
    userId,
    monthlyBudget: 0
  }));
  
  return await this.insertMany(categories);
};

/**
 * Set default category - Enterprise approach with atomic operations
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} categoryId - Category ID to set as default
 * @returns {Promise<Category>} - Updated category
 */
CategorySchema.statics.setDefaultCategory = async function(userId, categoryId) {
  // Get the category to determine its type
  const category = await this.findOne({ _id: categoryId, userId, isDeleted: false });
  if (!category) {
    throw new Error('Category not found');
  }

  // Use MongoDB session for atomic operation
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Step 1: Unset current default for this type
      await this.updateOne(
        { userId, type: category.type, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
      
      // Step 2: Set new default
      await this.updateOne(
        { _id: categoryId },
        { $set: { isDefault: true } },
        { session }
      );
    });
    
    return await this.findById(categoryId);
  } finally {
    await session.endSession();
  }
};

/**
 * Get default category for user and type
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type ('income' or 'expense')
 * @returns {Promise<Category|null>} - Default category or null
 */
CategorySchema.statics.getDefaultCategory = function(userId, type) {
  return this.findOne({ userId, type, isDefault: true, isDeleted: false });
};

/**
 * Ensure all indexes are created (production optimization)
 * @returns {Promise<void>}
 */
CategorySchema.statics.ensureIndexes = async function() {
  try {
    await this.ensureIndexes();
    console.log('✅ Category model indexes ensured successfully');
  } catch (error) {
    console.error('❌ Error ensuring Category indexes:', error.message);
    throw error;
  }
};

// =================================================================
//                      VIRTUAL PROPERTIES
// =================================================================

/**
 * Virtual for checking if category has children
 */
CategorySchema.virtual('hasChildren').get(function() {
  return this.children && this.children.length > 0;
});

// Ensure virtual fields are serialized
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });

// =================================================================
//                      MODEL EXPORT
// =================================================================

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;