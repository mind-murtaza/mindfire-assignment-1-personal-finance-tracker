import type { TransactionListQuery } from "../validation/transaction";

/**
 * Converts serialized filters (with string dates) to API format (with Date objects)
 * Used when sending filters to the API
 */
export function convertFiltersToApiFormat(filters: Record<string, unknown>): Partial<TransactionListQuery> {
	const apiFilters: Record<string, unknown> = { ...filters };
	
	// Convert ISO strings back to Date objects for API calls
	if (typeof apiFilters.startDate === 'string') {
		apiFilters.startDate = new Date(apiFilters.startDate);
	}
	if (typeof apiFilters.endDate === 'string') {
		apiFilters.endDate = new Date(apiFilters.endDate);
	}
	
	// Ensure page and limit are numbers to prevent string concatenation
	if (apiFilters.page !== undefined) {
		apiFilters.page = Number(apiFilters.page);
	}
	if (apiFilters.limit !== undefined) {
		apiFilters.limit = Number(apiFilters.limit);
	}
	
	return apiFilters as Partial<TransactionListQuery>;
}

/**
 * Converts serialized filters for UI components
 * Currently uses same logic as API format but can be extended
 */
export function convertFiltersForUI(filters: Record<string, unknown>): Partial<TransactionListQuery> {
	return convertFiltersToApiFormat(filters);
}

/**
 * Serializes Date objects in filters to ISO strings for Redux storage
 * Prevents Redux serialization warnings
 */
export function serializeFiltersForRedux(filters: Record<string, unknown>): Record<string, unknown> {
	const serializedFilters: Record<string, unknown> = { ...filters };
	
	if (serializedFilters.startDate instanceof Date) {
		serializedFilters.startDate = serializedFilters.startDate.toISOString();
	}
	if (serializedFilters.endDate instanceof Date) {
		serializedFilters.endDate = serializedFilters.endDate.toISOString();
	}
	
	return serializedFilters;
}
