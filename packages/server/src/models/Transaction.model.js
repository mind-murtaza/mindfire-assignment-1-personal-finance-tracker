/**
 * @fileoverview Transaction Model - Persistence and lightweight transformations
 * Core collection storing all individual financial events.
 *
 * Performance Optimizations:
 * - Primary index on `userId` + `transactionDate` for fast list queries
 * - Compound index on `userId` + `yearMonth` for monthly reports
 * - Category index for category-based filtering
 * - Denormalized `type` field for performance
 *
 * Data Transformations (non-business):
 * - Automatic `year`/`month`/`yearMonth` calculation for reporting
 * - Decimal128 amount conversion in JSON/object transforms
 * - Soft delete timestamp management
 *
 * Validation Strategy (API-first):
 * - All validation is handled at the route/service layer using Zod schemas
 * - The model only performs non-business data transformations
 * - No type/business validation is performed in this model
 *
 * Error Handling:
 * - Instance and static methods that perform DB operations use try/catch
 * - Errors are normalized with `status` and `code` where applicable
 *
 * @module models/Transaction
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');

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
      if (ret.amount !== undefined && ret.amount !== null) {
        ret.amount = parseFloat(String(ret.amount));
      }
      delete ret.__v;
      return ret;
    }
  },

  toObject: {
    transform: function(doc, ret) {
      if (ret.amount !== undefined && ret.amount !== null) {
        ret.amount = parseFloat(String(ret.amount));
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
  try {
    if (this.isModified('transactionDate')) {
      const date = new Date(this.transactionDate);
      this.year = date.getFullYear();
      this.month = date.getMonth() + 1; // getMonth() returns 0-11
      this.yearMonth = `${this.year}-${String(this.month).padStart(2, '0')}`;
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
  try {
    // Set deletedAt timestamp when marking as deleted
    if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
      this.deletedAt = new Date();
    }
    // Clear deletedAt when undeleting
    if (this.isModified('isDeleted') && !this.isDeleted && this.deletedAt) {
      this.deletedAt = null;
    }
    next();
  } catch (error) {
    next(error);
  }
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
  try {
    const cleanTag = tag.toLowerCase().trim();
    if (cleanTag && !this.tags.includes(cleanTag) && this.tags.length < 3) {
      this.tags.push(cleanTag);
      return await this.save();
    }
    return this;
  } catch (error) {
    if (error.status) throw error;
    const modelError = new Error('Failed to add tag');
    modelError.status = 500;
    modelError.code = 'ADD_TAG_ERROR';
    throw modelError;
  }
};

/**
 * Remove tag from transaction
 * @param {string} tag - Tag to remove
 * @returns {Promise<Transaction>} - Updated transaction
 */
TransactionSchema.methods.removeTag = async function(tag) {
  try {
    const cleanTag = tag.toLowerCase().trim();
    this.tags = this.tags.filter(t => t !== cleanTag);
    return await this.save();
  } catch (error) {
    if (error.status) throw error;
    const modelError = new Error('Failed to remove tag');
    modelError.status = 500;
    modelError.code = 'REMOVE_TAG_ERROR';
    throw modelError;
  }
};

/**
 * Soft delete transaction
 * @returns {Promise<Transaction>} - Updated transaction
 */
TransactionSchema.methods.softDelete = async function() {
  try {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return await this.save();
  } catch (error) {
    if (error.status) throw error;
    const modelError = new Error('Failed to soft delete transaction');
    modelError.status = 500;
    modelError.code = 'SOFT_DELETE_ERROR';
    throw modelError;
  }
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
    if (error.status) throw error;
    const modelError = new Error('Failed to retrieve transactions');
    modelError.status = 500;
    modelError.code = 'TRANSACTION_QUERY_ERROR';
    throw modelError;
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
    if (error.status) throw error;
    const modelError = new Error('Failed to generate monthly summary');
    modelError.status = 500;
    modelError.code = 'MONTHLY_SUMMARY_ERROR';
    throw modelError;
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
    if (error.status) throw error;
    const modelError = new Error('Failed to generate category breakdown');
    modelError.status = 500;
    modelError.code = 'CATEGORY_BREAKDOWN_ERROR';
    throw modelError;
  }
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