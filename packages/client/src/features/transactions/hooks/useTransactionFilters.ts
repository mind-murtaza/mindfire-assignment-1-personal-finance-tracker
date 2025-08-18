import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setFilters, clearFilters, fetchTransactions } from "../../../store/transactionSlice";
import { convertFiltersToApiFormat, convertFiltersForUI } from "../../../lib/utils/filters";

/**
 * Hook for managing transaction filters
 * Encapsulates filter state management and API calls
 */
export function useTransactionFilters() {
	const dispatch = useAppDispatch();
	const { currentFilters, status } = useAppSelector((state) => state.transactions);

	const handleFiltersChange = (filters: Partial<typeof currentFilters>) => {
		dispatch(setFilters(filters));
		dispatch(fetchTransactions(convertFiltersToApiFormat(filters)));
	};

	const handleClearFilters = () => {
		dispatch(clearFilters());
		dispatch(fetchTransactions({}));
	};

	// Convert serialized filters for UI consumption
	const uiFilters = convertFiltersForUI(currentFilters);

	return {
		filters: uiFilters,
		isLoading: status === "loading",
		onFiltersChange: handleFiltersChange,
		onClearFilters: handleClearFilters,
	};
}
