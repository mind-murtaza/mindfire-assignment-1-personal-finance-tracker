/**
 * @fileoverview Request Validation Middleware - Clean Zod Integration
 *
 * Simple, focused request validation using Zod schemas.
 * Validates request data and provides clear error messages.
 *
 * @module middlewares/validate
 * @author Murtaza
 * @version 1.0.0
 * @requires zod
 */

const { ZodError } = require("zod");

/**
 * Format validation errors with field-level feedback
 * @param {ZodError} zodError - Zod validation error
 * @returns {Object} Formatted error response
 */
function formatValidationErrors(zodError) {
	const errors = zodError.issues.map((issue) => ({
		field: issue.path.join(".") || "root",
		message: issue.message,
		code: issue.code,
	}));

	return {
		success: false,
		error: "Validation failed",
		code: "VALIDATION_ERROR",
		details: errors,
	};
}

/**
 * Simple validation middleware for request data
 *
 * @function validate
 * @param {Object} schema - Zod schema for validation
 * @param {string} [source='body'] - Request source to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 *
 * @example
 ** Validate request body
 * router.post('/users', validate(userSchema), controller.create);
 *
 ** Validate query parameters
 * router.get('/users', validate(paginationSchema, 'query'), controller.list);
 */
function validate(schema, source = "body", options = {}) {
	return (req, res, next) => {
		try {
			// Extract data from request
			const data = req[source] || {};

			// Validate with Zod schema
			const result = schema.safeParse(data);

			if (!result.success) {
				const { status = 400, mapError } = options || {};
				const errorResponse = mapError
					? mapError(result.error)
					: formatValidationErrors(result.error);
				return res.status(status).json(errorResponse);
			}

			// Apply validated/transformed data back to request
			req[source] = result.data;

			next();
		} catch (error) {
			// Pass unexpected errors to error handler
			next(error);
		}
	};
}

module.exports = {
	validate,
};
