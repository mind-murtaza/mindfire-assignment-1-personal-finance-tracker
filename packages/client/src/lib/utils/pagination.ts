interface PaginationInfo {
	page: number;
	limit: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

/**
 * Ensures pagination values are numbers to prevent string concatenation bugs
 * JavaScript quirk: "1" + 1 = "11" instead of 2
 */
export function normalizePaginationValues(pagination: PaginationInfo): PaginationInfo {
	return {
		page: Number(pagination.page || 1),
		limit: Number(pagination.limit || 20),
		totalPages: Number(pagination.totalPages || 0),
		hasNext: Boolean(pagination.hasNext),
		hasPrev: Boolean(pagination.hasPrev),
	};
}
