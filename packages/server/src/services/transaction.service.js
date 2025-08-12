/**
 * @fileoverview Transaction Service - Business Logic Only
 * Contains all transaction business logic and data operations.
 * Follows API-first architecture: shape/type validation is handled in routes,
 * while business rules are enforced here.
 *
 * @module services/transaction
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires ../models
 * @requires ../models
 */

const { Transaction, Category } = require('../models');

// Removed development logs
function txnLog() {}

// =================================================================
// BUSINESS VALIDATION HELPERS
// =================================================================

/**
 * Validate transaction category relationship
 * @async
 * @function validateTransactionCategory
 * @param {string} categoryId - Category ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Category document
 * @throws {Error} When category validation fails
 */
async function validateTransactionCategory(categoryId, userId) {
  try {
    const category = await Category.findOne({
      _id: categoryId,
      userId: userId,
      isDeleted: false
    });

    if (!category) {
      const error = new Error('Category not found or does not belong to user');
      error.status = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }

    return category;
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to validate category');
    serviceError.status = 500;
    serviceError.code = 'CATEGORY_VALIDATION_ERROR';
    throw serviceError;
  }
}

/**
 * Validate daily transaction limits
 * @async
 * @function validateDailyTransactionLimit
 * @param {string} userId - User ID
 * @param {Date} transactionDate - Transaction date
 * @param {string} excludeId - Transaction ID to exclude (for updates)
 * @returns {Promise<void>}
 * @throws {Error} When daily limit exceeded
 */
async function validateDailyTransactionLimit(userId, transactionDate, excludeId = null) {
  try {
    const date = new Date(transactionDate);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const query = {
      userId: userId,
      transactionDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      isDeleted: false
    };

    // Exclude current transaction if updating
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const dailyCount = await Transaction.countDocuments(query);

    if (dailyCount >= 100) {
      const error = new Error('Daily transaction limit of 100 has been reached');
      error.status = 429;
      error.code = 'DAILY_LIMIT_EXCEEDED';
      throw error;
    }
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to validate daily limit');
    serviceError.status = 500;
    serviceError.code = 'DAILY_LIMIT_VALIDATION_ERROR';
    throw serviceError;
  }
}

/**
 * Validate transaction amount and type consistency
 * @function validateTransactionAmountType
 * @param {number} amount - Transaction amount
 * @param {string} type - Transaction type (income/expense)
 * @throws {Error} When amount-type validation fails
 */
function validateTransactionAmountType(amount, type) {
  if (type === 'income' && amount < 0) {
    const error = new Error('Income transactions must have positive amounts');
    error.status = 400;
    error.code = 'INVALID_INCOME_AMOUNT';
    throw error;
  }

  if (type === 'expense' && amount < 0) {
    const error = new Error('Expense transactions must have positive amounts');
    error.status = 400;
    error.code = 'INVALID_EXPENSE_AMOUNT';
    throw error;
  }
}

// =================================================================
// TRANSACTION SERVICE METHODS
// =================================================================

/**
 * Create new transaction
 * @async
 * @function createTransaction
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction
 * @throws {Error} When creation fails
 */
async function createTransaction(transactionData) {
  try {
    txnLog();
    const data = transactionData;

    // Step 1: Validate category relationship and get type
    const category = await validateTransactionCategory(
      data.categoryId, 
      data.userId
    );

    // Step 2: Set type from category if not provided or validate consistency
    if (!data.type) {
      data.type = category.type;
    } else if (data.type !== category.type) {
      const error = new Error(`Transaction type must match category type (${category.type})`);
      error.status = 400;
      error.code = 'TYPE_MISMATCH';
      throw error;
    }

    // Step 3: Validate amount and type consistency
    validateTransactionAmountType(data.amount, data.type);

    // Step 4: Check daily transaction limits
    await validateDailyTransactionLimit(data.userId, data.transactionDate);

    // Step 5: Create transaction
    const transaction = new Transaction(data);
    await transaction.save();

    // Step 6: Populate category for response
    await transaction.populate('categoryId', 'name color icon type');

    txnLog();

    return transaction;
  } catch (error) {
    txnLog();
    if (error.status) throw error;
    const serviceError = new Error('Failed to create transaction');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_CREATION_ERROR';
    throw serviceError;
  }
}

/**
 * Get transactions with filters and pagination
 * @async
 * @function getTransactions
 * @param {Object} filters - Query filters and pagination
 * @returns {Promise<Object>} Transactions with pagination and summary
 * @throws {Error} When retrieval fails
 */
async function getTransactions(filters) {
  try {
    // Pagination options
    const options = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'transactionDate',
      sortOrder: filters.sortOrder || 'desc'
    };

    // Use model's static method for complex filtering
    // Pass original filters directly - model handles query building
    const result = await Transaction.findWithFilters(filters, options);

    return result;
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to retrieve transactions');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_RETRIEVAL_ERROR';
    throw serviceError;
  }
}

/**
 * Get single transaction by ID
 * @async
 * @function getTransactionById
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Transaction document
 * @throws {Error} When transaction not found
 */
async function getTransactionById(transactionId, userId) {
  try {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: userId,
      isDeleted: false
    }).populate('categoryId', 'name color icon type');

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    return transaction;
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to retrieve transaction');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_RETRIEVAL_ERROR';
    throw serviceError;
  }
}

/**
 * Update transaction
 * @async
 * @function updateTransaction
 * @param {string} transactionId - Transaction ID
 * @param {Object} updateData - Update data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated transaction
 * @throws {Error} When update fails
 */
async function updateTransaction(transactionId, updateData, userId) {
  try {
    txnLog();
    // Step 1: Find existing transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: userId,
      isDeleted: false
    });

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // Step 2: Validate category if being updated
    if (updateData.categoryId) {
      const category = await validateTransactionCategory(updateData.categoryId, userId);
      
      // Set type from category or validate consistency
      if (updateData.type && updateData.type !== category.type) {
        const error = new Error(`Transaction type must match category type (${category.type})`);
        error.status = 400;
        error.code = 'TYPE_MISMATCH';
        throw error;
      }
      
      updateData.type = category.type;
    }

    // Step 3: Validate amount and type if being updated
    const finalAmount = (updateData.amount !== undefined) ? updateData.amount : transaction.getAmount();
    const finalType = (updateData.type !== undefined) ? updateData.type : transaction.type;
    validateTransactionAmountType(finalAmount, finalType);

    // Step 4: Check daily limits if date is being changed
    if (updateData.transactionDate) {
      await validateDailyTransactionLimit(
        userId, 
        updateData.transactionDate, 
        transactionId
      );
    }

    // Step 5: Apply updates
    Object.assign(transaction, updateData);
    txnLog();
    await transaction.save();

    // Step 6: Populate category for response
    await transaction.populate('categoryId', 'name color icon type');
    txnLog();

    return transaction;
  } catch (error) {
    txnLog();
    if (error.status) throw error;
    const serviceError = new Error('Failed to update transaction');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_UPDATE_ERROR';
    throw serviceError;
  }
}

/**
 * Soft delete transaction
 * @async
 * @function deleteTransaction
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 * @throws {Error} When deletion fails
 */
async function deleteTransaction(transactionId, userId) {
  try {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: userId,
      isDeleted: false
    });

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    await transaction.softDelete();
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to delete transaction');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_DELETION_ERROR';
    throw serviceError;
  }
}

/**
 * Get transaction summary
 * @async
 * @function getTransactionSummary
 * @param {string} userId - User ID
 * @param {Object} options - Summary options (year, month, date range)
 * @returns {Promise<Object>} Transaction summary
 * @throws {Error} When summary generation fails
 */
async function getTransactionSummary(userId, options = {}) {
  try {
    if (options.year && options.month) {
      // Monthly summary
      return await Transaction.getMonthlySummary(userId, options.year, options.month);
    } else if (options.startDate || options.endDate) {
      // Date range summary - use findWithFilters
      const filters = {
        userId,
        startDate: options.startDate,
        endDate: options.endDate
      };
      const result = await Transaction.findWithFilters(filters, { page: 1, limit: 1 });
      return result.summary;
    } else {
      // Overall summary - current month
      const now = new Date();
      return await Transaction.getMonthlySummary(userId, now.getFullYear(), now.getMonth() + 1);
    }
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to generate transaction summary');
    serviceError.status = 500;
    serviceError.code = 'SUMMARY_GENERATION_ERROR';
    throw serviceError;
  }
}

/**
 * Get category breakdown
 * @async
 * @function getCategoryBreakdown
 * @param {string} userId - User ID
 * @param {Object} options - Breakdown options (date range, type)
 * @returns {Promise<Array>} Category breakdown
 * @throws {Error} When breakdown generation fails
 */
async function getCategoryBreakdown(userId, options = {}) {
  try {
    const dateRange = {};
    if (options.startDate) dateRange.startDate = options.startDate;
    if (options.endDate) dateRange.endDate = options.endDate;

    let breakdown = await Transaction.getCategoryBreakdown(userId, dateRange);

    // Filter by type if specified
    if (options.type) {
      breakdown = breakdown.filter(item => item.type === options.type);
    }

    return breakdown;
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to generate category breakdown');
    serviceError.status = 500;
    serviceError.code = 'BREAKDOWN_GENERATION_ERROR';
    throw serviceError;
  }
}

/**
 * Clone/duplicate transaction
 * @async
 * @function cloneTransaction
 * @param {string} transactionId - Transaction ID to clone
 * @param {Object} overrides - Fields to override in clone
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Cloned transaction
 * @throws {Error} When cloning fails
 */
async function cloneTransaction(transactionId, overrides = {}, userId) {
  try {
    // Step 1: Find original transaction
    const originalTransaction = await Transaction.findOne({
      _id: transactionId,
      userId: userId,
      isDeleted: false
    });

    if (!originalTransaction) {
      const error = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // Step 2: Create clone data with overrides
    const cloneData = originalTransaction.clone(overrides);
    cloneData.userId = userId; // Ensure userId is set

    // Step 3: Create the cloned transaction using the service method
    return await createTransaction(cloneData);
  } catch (error) {
    if (error.status) throw error;
    const serviceError = new Error('Failed to clone transaction');
    serviceError.status = 500;
    serviceError.code = 'TRANSACTION_CLONE_ERROR';
    throw serviceError;
  }
}

// =================================================================
// MODULE EXPORTS
// =================================================================

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getCategoryBreakdown,
  cloneTransaction
};
