/**
 * Transaction Model 
 * Purpose: Core collection storing all individual financial events
 * 
 * Performance Optimizations:
 * - Primary index on userId + transactionDate for fast list queries
 * - Compound index on userId + yearMonth for monthly reports
 * - Category index for category-based filtering
 * - Denormalized type field for performance
 * 
 * Business Logic:
 * - Automatic year/month/yearMonth calculation for reporting
 * - Decimal128 for precise financial calculations
 * - Soft delete support
 * - Tag-based organization
 * 
 * Validation Strategy:
 * - Field validation: Handled by Zod schemas in pre-save hook
 * - Business logic validation: Handled by Mongoose middleware
 * - Daily transaction limits: Enforced via pre-save middleware
 */

const mongoose = require('mongoose');
const { createTransactionSchema, updateTransactionSchema } = require('../schemas');

const { Schema } = mongoose;

// =================================================================
//                   TRANSACTION SCHEMA DEFINITION
// =================================================================

const TransactionSchema = new Schema({
  // Owner and category references
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },

  // Financial data
  amount: {
    type: Schema.Types.Decimal128
  },

  // Denormalized type field for performance (from Category)
  type: {
    type: String
  },

  // Transaction details
  description: {
    type: String,
    trim: true
  },

  notes: {
    type: String,
    trim: true,
    default: null
  },

  // Date handling
  transactionDate: {
    type: Date
  },

  // Performance optimization fields (auto-calculated)
  year: {
    type: Number
  },

  month: {
    type: Number
  },

  yearMonth: {
    type: String
  },

  // Organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

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
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'transactions',
  
  // Optimize for memory and performance
  minimize: false,
  validateBeforeSave: true,
  
  // JSON transformation
  toJSON: {
    transform: function(doc, ret) {
      // Convert Decimal128 to number for JSON
      if (ret.amount) {
        ret.amount = parseFloat(ret.amount.toString());
      }
      delete ret.__v;
      return ret;
    }
  },

  toObject: {
    transform: function(doc, ret) {
      if (ret.amount) {
        ret.amount = parseFloat(ret.amount.toString());
      }
      delete ret.__v;
      return ret;
    }
  }
});

// =================================================================
//                          INDEXES
// =================================================================

// Primary indexes for core queries
TransactionSchema.index({ userId: 1, transactionDate: -1 }, { background: true });
TransactionSchema.index({ userId: 1, yearMonth: 1 }, { background: true });
TransactionSchema.index({ userId: 1, categoryId: 1 }, { background: true });

// Additional performance indexes
TransactionSchema.index({ userId: 1, type: 1, transactionDate: -1 }, { background: true });
TransactionSchema.index({ userId: 1, year: 1, month: 1 }, { background: true });
TransactionSchema.index({ userId: 1, tags: 1 }, { background: true });
TransactionSchema.index({ userId: 1, amount: 1 }, { background: true });
TransactionSchema.index({ isDeleted: 1 }, { background: true });
TransactionSchema.index({ userId: 1, isDeleted: 1, transactionDate: -1 }, { background: true });

// Compound indexes for complex queries
TransactionSchema.index({ 
  userId: 1, 
  type: 1, 
  yearMonth: 1 
}, { background: true });

TransactionSchema.index({ 
  userId: 1, 
  categoryId: 1, 
  transactionDate: -1 
}, { background: true });

// =================================================================
//                      MIDDLEWARE HOOKS
// =================================================================

/**
 * Pre-save middleware for automatic date field calculation
 */
TransactionSchema.pre('save', function(next) {
  if (this.isModified('transactionDate')) {
    const date = new Date(this.transactionDate);
    this.year = date.getFullYear();
    this.month = date.getMonth() + 1; // getMonth() returns 0-11
    this.yearMonth = `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
  
  next();
});

/**
 * Pre-save middleware for Zod validation
 * Validates all field-level constraints using Zod schemas
 */
TransactionSchema.pre('save', function(next) {
  try {
    // Only validate new documents with Zod to avoid Mongoose-added fields issue
    if (this.isNew) {
      // Construct plain object for Zod validation
      const plainTransactionObject = {
        userId: this.userId,
        categoryId: this.categoryId,
        amount: this.amount ? parseFloat(this.amount.toString()) : undefined,
        type: this.type,
        description: this.description,
        notes: this.notes,
        transactionDate: this.transactionDate,
        tags: this.tags
      };

      const validation = createTransactionSchema.safeParse(plainTransactionObject);
      
      if (!validation.success) {
        const error = new Error(validation.error.issues[0].message);
        error.name = 'ValidationError';
        return next(error);
      }

      // Apply Zod transformations back to document
      const { description, tags } = validation.data;
      this.description = description; // Zod trim transformation
      this.tags = tags;
    } else {
      const modifiedFields = {};
      
      // Only validate fields that were actually modified
      if (this.isModified('amount')) {
        modifiedFields.amount = this.amount ? parseFloat(this.amount.toString()) : undefined;
      }
      if (this.isModified('type')) modifiedFields.type = this.type;
      if (this.isModified('description')) modifiedFields.description = this.description;
      if (this.isModified('notes')) modifiedFields.notes = this.notes;
      if (this.isModified('transactionDate')) modifiedFields.transactionDate = this.transactionDate;
      if (this.isModified('tags')) modifiedFields.tags = this.tags;
      if (this.isModified('isDeleted')) modifiedFields.isDeleted = this.isDeleted;
      if (this.isModified('deletedAt')) modifiedFields.deletedAt = this.deletedAt;

      // Only validate if there are actually modified fields to validate
      if (Object.keys(modifiedFields).length > 0) {
        const validation = updateTransactionSchema.safeParse(modifiedFields);
        
        if (!validation.success) {
          const error = new Error(validation.error.issues[0].message);
          error.name = 'ValidationError';
          return next(error);
        }

        // Apply Zod transformations for updates
        if (validation.data.description !== undefined) this.description = validation.data.description;
        if (validation.data.tags !== undefined) this.tags = validation.data.tags;
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
TransactionSchema.pre('save', async function(next) {
  try {
    // STEP 1: Validate category exists and belongs to user
    if (this.isModified('categoryId')) {
      const Category = mongoose.model('Category');
      
      const category = await Category.findOne({
        _id: this.categoryId,
        userId: this.userId,
        isDeleted: false
      });
      
      if (!category) {
        const error = new Error('Category not found or does not belong to user');
        error.name = 'ValidationError';
        return next(error);
      }
      
      // Auto-set type from category if not provided or different
      if (!this.type || this.type !== category.type) {
        this.type = category.type;
      }
    }

    // STEP 2: Enforce daily transaction limits (NEW TRANSACTIONS ONLY)
    if (this.isNew) {
      const today = new Date(this.transactionDate);
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const dailyCount = await this.constructor.countDocuments({
        userId: this.userId,
        transactionDate: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        isDeleted: false
      });

      if (dailyCount >= 100) {
        const error = new Error('Daily transaction limit of 100 has been reached');
        error.name = 'ValidationError';
        return next(error);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware for soft delete logic
 */
TransactionSchema.pre('save', function(next) {
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

/**
 * Pre-save middleware for tag processing
 */
TransactionSchema.pre('save', function(next) {
  // Clean up tags: remove duplicates, empty strings, and enforce limits
  if (this.isModified('tags')) {
    const cleanTags = [...new Set(this.tags)]
      .filter(tag => tag && tag.trim().length > 0)
      .slice(0, 3); // Max 3 tags as per DB_SCHEMA.MD
    
    this.tags = cleanTags;
  }
  
  next();
});

// =================================================================
//                      INSTANCE METHODS
// =================================================================

/**
 * Get transaction amount as number
 * @returns {number} - Transaction amount
 */
TransactionSchema.methods.getAmount = function() {
  return parseFloat(this.amount.toString());
};

/**
 * Format amount for display
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted amount
 */
TransactionSchema.methods.getFormattedAmount = function(currency = 'USD') {
  const amount = this.getAmount();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Check if transaction is income
 * @returns {boolean} - True if income transaction
 */
TransactionSchema.methods.isIncome = function() {
  return this.type === 'income';
};

/**
 * Check if transaction is expense
 * @returns {boolean} - True if expense transaction
 */
TransactionSchema.methods.isExpense = function() {
  return this.type === 'expense';
};

/**
 * Add tag to transaction
 * @param {string} tag - Tag to add
 * @returns {Promise<Transaction>} - Updated transaction
 */
TransactionSchema.methods.addTag = async function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  
  if (cleanTag && !this.tags.includes(cleanTag) && this.tags.length < 3) {
    this.tags.push(cleanTag);
    return await this.save();
  }
  
  return this;
};

/**
 * Remove tag from transaction
 * @param {string} tag - Tag to remove
 * @returns {Promise<Transaction>} - Updated transaction
 */
TransactionSchema.methods.removeTag = async function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== cleanTag);
  return await this.save();
};

/**
 * Soft delete transaction
 * @returns {Promise<Transaction>} - Updated transaction
 */
TransactionSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

/**
 * Clone transaction for duplication
 * @param {Object} overrides - Fields to override
 * @returns {Object} - Transaction data for creation
 */
TransactionSchema.methods.clone = function(overrides = {}) {
  const cloneData = {
    userId: this.userId,
    categoryId: this.categoryId,
    amount: this.getAmount(),
    type: this.type,
    description: this.description,
    notes: this.notes,
    transactionDate: new Date(),
    tags: [...this.tags],
    ...overrides
  };
  
  return cloneData;
};

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Find transactions with filters and pagination
 * @param {Object} filters - Query filters
 * @param {Object} options - Pagination and sorting options
 * @returns {Promise<{transactions: Transaction[], total: number, summary: Object}>}
 */
TransactionSchema.statics.findWithFilters = async function(filters = {}, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = options;
    
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    // Build query
    const query = { isDeleted: false };
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.type) query.type = filters.type;
    if (filters.minAmount) query.amount = { $gte: filters.minAmount };
    if (filters.maxAmount) query.amount = { ...query.amount, $lte: filters.maxAmount };
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    
    // Date range handling
    if (filters.startDate || filters.endDate) {
      query.transactionDate = {};
      if (filters.startDate) query.transactionDate.$gte = filters.startDate;
      if (filters.endDate) query.transactionDate.$lte = filters.endDate;
    }
    
    // Execute queries in parallel
    const [transactions, total, summary] = await Promise.all([
      this.find(query)
        .populate('categoryId', 'name color icon type')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      this.countDocuments(query),
      
      this.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Format summary
    const formattedSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      incomeCount: 0,
      expenseCount: 0,
      netAmount: 0
    };
    
    summary.forEach(item => {
      if (item._id === 'income') {
        formattedSummary.totalIncome = item.total;
        formattedSummary.incomeCount = item.count;
      } else if (item._id === 'expense') {
        formattedSummary.totalExpenses = item.total;
        formattedSummary.expenseCount = item.count;
      }
    });
    
    formattedSummary.netAmount = formattedSummary.totalIncome - formattedSummary.totalExpenses;
    
    return {
      transactions,
      total,
      summary: formattedSummary,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw new Error(`Failed to retrieve transactions: ${error.message}`);
  }
};

/**
 * Get monthly summary for user
 * @param {ObjectId} userId - User ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} - Monthly summary
 */
TransactionSchema.statics.getMonthlySummary = async function(userId, year, month) {
  try {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    const summary = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          yearMonth: yearMonth,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 },
          avgAmount: { $avg: { $toDouble: '$amount' } }
        }
      }
    ]);
    
    const result = {
      year,
      month,
      yearMonth,
      income: { total: 0, count: 0, avgAmount: 0 },
      expenses: { total: 0, count: 0, avgAmount: 0 },
      netAmount: 0
    };
    
    summary.forEach(item => {
      if (item._id === 'income') {
        result.income = {
          total: item.total,
          count: item.count,
          avgAmount: item.avgAmount
        };
      } else if (item._id === 'expense') {
        result.expenses = {
          total: item.total,
          count: item.count,
          avgAmount: item.avgAmount
        };
      }
    });
    
    result.netAmount = result.income.total - result.expenses.total;
    
    return result;
  } catch (error) {
    throw new Error(`Failed to generate monthly summary: ${error.message}`);
  }
};

/**
 * Get category breakdown for user
 * @param {ObjectId} userId - User ID
 * @param {Object} dateRange - Date range filter
 * @returns {Promise<Array>} - Category breakdown
 */
TransactionSchema.statics.getCategoryBreakdown = async function(userId, dateRange = {}) {
  try {
    const matchStage = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false
    };
    
    if (dateRange.startDate || dateRange.endDate) {
      matchStage.transactionDate = {};
      if (dateRange.startDate) matchStage.transactionDate.$gte = dateRange.startDate;
      if (dateRange.endDate) matchStage.transactionDate.$lte = dateRange.endDate;
    }
    
    return await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            categoryId: '$categoryId',
            type: '$type'
          },
          total: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 },
          avgAmount: { $avg: { $toDouble: '$amount' } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          categoryId: '$_id.categoryId',
          categoryName: '$category.name',
          categoryColor: '$category.color',
          categoryIcon: '$category.icon',
          type: '$_id.type',
          total: 1,
          count: 1,
          avgAmount: 1,
          percentage: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
  } catch (error) {
    throw new Error(`Failed to generate category breakdown: ${error.message}`);
  }
};

/**
 * Validate transaction data against Zod schema
 * @param {Object} transactionData - Transaction data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} - Validation result
 */
TransactionSchema.statics.validateData = function(transactionData, isUpdate = false) {
  const schema = isUpdate ? updateTransactionSchema : createTransactionSchema;
  return schema.safeParse(transactionData);
};



// =================================================================
//                      VIRTUAL PROPERTIES
// =================================================================

/**
 * Virtual for formatted amount display
 */
TransactionSchema.virtual('formattedAmount').get(function() {
  return this.getFormattedAmount();
});

/**
 * Virtual for human-readable date
 */
TransactionSchema.virtual('humanDate').get(function() {
  return this.transactionDate.toLocaleDateString();
});

/**
 * Virtual for month name
 */
TransactionSchema.virtual('monthName').get(function() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[this.month - 1];
});

// Ensure virtual fields are serialized
TransactionSchema.set('toJSON', { virtuals: true });
TransactionSchema.set('toObject', { virtuals: true });

// =================================================================
//                      MODEL EXPORT
// =================================================================

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;