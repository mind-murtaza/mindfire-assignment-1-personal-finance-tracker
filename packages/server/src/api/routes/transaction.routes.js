/**
 * @fileoverview Transaction Routes - RESTful API endpoints for transactions
 * Handles all transaction-related HTTP routes with comprehensive validation.
 * Follows API-first architecture with route-level validation.
 *
 * @module api/routes/transaction
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 */

const router = require("express").Router();
const { validate } = require("../middlewares/validate");
const { auth } = require("../middlewares/auth");
const { z } = require("zod");
const transactionController = require("../../controllers/transaction.controller");
const {
	transactionIdParamSchema,
	createTransactionRequestSchema,
	updateTransactionRequestSchema,
	transactionListQuerySchema,
	transactionSummaryQuerySchema,
	transactionBreakdownQuerySchema,
	transactionCloneOverridesSchema,
} = require("../../schemas/transaction.schema");

// Protect all transaction routes
router.use(auth);

// =================================================================
// TRANSACTION ROUTES
// =================================================================

/**
 * GET /api/v1/transactions
 * Get user's transactions with filters and pagination
 */
router.get(
	"/",
	validate(transactionListQuerySchema, "query"),
	transactionController.getTransactions
);

/**
 * POST /api/v1/transactions
 * Create new transaction
 */
router.post(
	"/",
	validate(createTransactionRequestSchema),
	(req, res, next) => {
		try {
			// Add userId from auth to request body
			req.body.userId = req.auth.userId;
			next();
		} catch (err) {
			next(err);
		}
	},
	transactionController.createTransaction
);

/**
 * GET /api/v1/transactions/summary
 * Get transaction summary and analytics
 */
router.get(
	"/summary",
	validate(transactionSummaryQuerySchema, "query"),
	transactionController.getTransactionSummary
);

/**
 * GET /api/v1/transactions/category-breakdown
 * Get spending breakdown by categories
 */
router.get(
	"/category-breakdown",
	validate(transactionBreakdownQuerySchema, "query"),
	transactionController.getCategoryBreakdown
);

/**
 * GET /api/v1/transactions/:id
 * Get single transaction by ID
 */
router.get(
	"/:id",
	validate(transactionIdParamSchema, "params"),
	transactionController.getTransaction
);

/**
 * PATCH /api/v1/transactions/:id
 * Update transaction
 */
router.patch(
	"/:id",
	validate(transactionIdParamSchema, "params"),
	validate(updateTransactionRequestSchema),
	transactionController.updateTransaction
);

/**
 * DELETE /api/v1/transactions/:id
 * Soft delete transaction
 */
router.delete(
	"/:id",
	validate(transactionIdParamSchema, "params"),
	transactionController.deleteTransaction
);

/**
 * POST /api/v1/transactions/:id/clone
 * Clone/duplicate a transaction
 */
router.post(
	"/:id/clone",
	validate(transactionIdParamSchema, "params"),
	validate(transactionCloneOverridesSchema),
	transactionController.cloneTransaction
);

module.exports = router;
