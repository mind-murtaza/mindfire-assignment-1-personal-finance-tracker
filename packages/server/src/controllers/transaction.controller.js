/**
 * @fileoverview Transaction Controller - HTTP Request Handling
 * Thin controller layer for transaction operations following SOLID principles.
 * Handles HTTP requests and delegates business logic to service layer.
 *
 * @module controllers/transaction
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires ../services/transaction.service
 */

const transactionService = require("../services/transaction.service");

// =================================================================
// ERROR HANDLING UTILITY
// =================================================================

/**
 * Standardized error forwarding for transaction controller
 * @param {Error} err - Error object
 * @param {Function} next - Express next function
 */
function forwardTransactionError(err, next) {
	if (!err) return next();

	// Normalize common error cases
	if (err.code === 11000 || err.code === 11001) {
		err.status = err.status || 409;
		err.message = err.message || "Duplicate transaction";
	}

	if (!err.status) {
		err.status = 500;
		err.code = err.code || "TRANSACTION_CONTROLLER_ERROR";
	}

	return next(err);
}

// =================================================================
// TRANSACTION CONTROLLER METHODS
// =================================================================

/**
 * Create new transaction
 * @async
 * @function createTransaction
 * @param {Object} req - Express request object
 * @param {Object} req.body - Transaction data (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with created transaction
 */
const createTransaction = async (req, res, next) => {
	try {
		const transaction = await transactionService.createTransaction(req.body);
		res.status(201).json({
			success: true,
			data: transaction,
			message: "Transaction created successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Get transactions with filters and pagination
 * @async
 * @function getTransactions
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with transactions list
 */
const getTransactions = async (req, res, next) => {
	try {
		const filters = { ...req.query, userId: req.auth.userId };
		const result = await transactionService.getTransactions(filters);
		res.json({
			success: true,
			data: result,
			message: "Transactions retrieved successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Get single transaction by ID
 * @async
 * @function getTransaction
 * @param {Object} req - Express request object
 * @param {Object} req.params.id - Transaction ID (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with transaction data
 */
const getTransaction = async (req, res, next) => {
	try {
		const transaction = await transactionService.getTransactionById(
			req.params.id,
			req.auth.userId
		);
		res.json({
			success: true,
			data: transaction,
			message: "Transaction retrieved successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Update transaction
 * @async
 * @function updateTransaction
 * @param {Object} req - Express request object
 * @param {Object} req.params.id - Transaction ID (validated by middleware)
 * @param {Object} req.body - Update data (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with updated transaction
 */
const updateTransaction = async (req, res, next) => {
	try {
		const transaction = await transactionService.updateTransaction(
			req.params.id,
			req.body,
			req.auth.userId
		);
		res.json({
			success: true,
			data: transaction,
			message: "Transaction updated successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Soft delete transaction
 * @async
 * @function deleteTransaction
 * @param {Object} req - Express request object
 * @param {Object} req.params.id - Transaction ID (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response confirming deletion
 */
const deleteTransaction = async (req, res, next) => {
	try {
		await transactionService.deleteTransaction(req.params.id, req.auth.userId);
		res.json({
			success: true,
			message: "Transaction deleted successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Get transaction summary and analytics
 * @async
 * @function getTransactionSummary
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with summary data
 */
const getTransactionSummary = async (req, res, next) => {
	try {
		const summary = await transactionService.getTransactionSummary(
			req.auth.userId,
			req.query
		);
		res.json({
			success: true,
			data: summary,
			message: "Transaction summary retrieved successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Get category breakdown
 * @async
 * @function getCategoryBreakdown
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with category breakdown
 */
const getCategoryBreakdown = async (req, res, next) => {
	try {
		const breakdown = await transactionService.getCategoryBreakdown(
			req.auth.userId,
			req.query
		);
		res.json({
			success: true,
			data: breakdown,
			message: "Category breakdown retrieved successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

/**
 * Clone/duplicate transaction
 * @async
 * @function cloneTransaction
 * @param {Object} req - Express request object
 * @param {Object} req.params.id - Transaction ID (validated by middleware)
 * @param {Object} req.body - Clone overrides (validated by middleware)
 * @param {Object} req.auth - Auth info (userId from middleware)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} HTTP response with cloned transaction
 */
const cloneTransaction = async (req, res, next) => {
	try {
		const clonedTransaction = await transactionService.cloneTransaction(
			req.params.id,
			req.body,
			req.auth.userId
		);
		res.status(201).json({
			success: true,
			data: clonedTransaction,
			message: "Transaction cloned successfully",
		});
	} catch (err) {
		forwardTransactionError(err, next);
	}
};

// =================================================================
// MODULE EXPORTS
// =================================================================

module.exports = {
	createTransaction,
	getTransactions,
	getTransaction,
	updateTransaction,
	deleteTransaction,
	getTransactionSummary,
	getCategoryBreakdown,
	cloneTransaction,
};
