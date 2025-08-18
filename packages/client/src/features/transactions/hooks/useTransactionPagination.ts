import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setFilters, fetchTransactions, loadMoreTransactions } from "../../../store/transactionSlice";
import { convertFiltersToApiFormat } from "../../../lib/utils/filters";
import { normalizePaginationValues } from "../../../lib/utils/pagination";

/**
 * Hook for managing transaction pagination
 * Encapsulates pagination state and navigation logic
 */
export function useTransactionPagination() {
	const dispatch = useAppDispatch();
	const { pagination, currentFilters, status, total } = useAppSelector((state) => state.transactions);

	// Normalize pagination values to prevent string concatenation
	const normalizedPagination = normalizePaginationValues(pagination);

	const handlePageChange = (page: number) => {
		const newFilters = { ...currentFilters, page };
		dispatch(setFilters(newFilters));
		dispatch(fetchTransactions(convertFiltersToApiFormat(newFilters)));
	};

	const handleLimitChange = (limit: number) => {
		const newFilters = { ...currentFilters, limit, page: 1 }; // Reset to page 1
		dispatch(setFilters(newFilters));
		dispatch(fetchTransactions(convertFiltersToApiFormat(newFilters)));
	};

	const handleLoadMore = () => {
		dispatch(loadMoreTransactions(convertFiltersToApiFormat(currentFilters)));
	};

	return {
		pagination: normalizedPagination,
		total,
		isLoading: status === "loading",
		onPageChange: handlePageChange,
		onLimitChange: handleLimitChange,
		onLoadMore: handleLoadMore,
	};
}
