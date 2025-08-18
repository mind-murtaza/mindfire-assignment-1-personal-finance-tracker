import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../ui/Button";
import { normalizePaginationValues } from "../../lib/utils/pagination";

interface PaginationInfo {
	page: number;
	limit: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

interface Props {
	pagination: PaginationInfo;
	total: number;
	onPageChange: (page: number) => void;
	onLimitChange: (limit: number) => void;
	loading?: boolean;
}

export default function TransactionPagination({
	pagination,
	total,
	onPageChange,
	onLimitChange,
	loading = false,
}: Props) {
	// Use utility function to normalize pagination values and preserve all properties
	const normalizedPagination = normalizePaginationValues(pagination);
	const { page: currentPage, limit: currentLimit, totalPages: currentTotalPages, hasNext, hasPrev } = normalizedPagination;
	
	const startItem = (currentPage - 1) * currentLimit + 1;
	const endItem = Math.min(currentPage * currentLimit, total);

	return (
		<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
			{/* Items per page selector */}
			<div className="flex items-center gap-2">
				<span className="text-sm text-neutral-600">Show:</span>
				<select
					value={currentLimit}
					onChange={(e) => onLimitChange(Number(e.target.value))}
					disabled={loading}
					className="px-2 py-1 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
					aria-label="Items per page"
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
				</select>
				<span className="text-sm text-neutral-600">per page</span>
			</div>

			{/* Current range info */}
			<div className="text-sm text-neutral-600">
				{total > 0 ? (
					<>
						Showing <span className="font-medium">{startItem}</span> to{" "}
						<span className="font-medium">{endItem}</span> of{" "}
						<span className="font-medium">{total}</span> transactions
					</>
				) : (
					"No transactions found"
				)}
			</div>

			{/* Page navigation */}
			{currentTotalPages > 1 && (
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(currentPage - 1)}
						disabled={!hasPrev || loading}
						aria-label="Previous page"
					>
						<ChevronLeft className="w-4 h-4" />
						Previous
					</Button>

					{/* Page numbers (simplified - show current and nearby pages) */}
					<div className="flex items-center gap-1">
						{currentPage > 2 && (
							<>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onPageChange(1)}
									disabled={loading}
								>
									1
								</Button>
								{currentPage > 3 && (
									<span className="px-2 text-sm text-neutral-400">...</span>
								)}
							</>
						)}

						{currentPage > 1 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onPageChange(currentPage - 1)}
								disabled={loading}
							>
								{currentPage - 1}
							</Button>
						)}

						<Button variant="primary" size="sm" disabled>
							{currentPage}
						</Button>

						{currentPage < currentTotalPages && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onPageChange(currentPage + 1)}
								disabled={loading}
							>
								{currentPage + 1}
							</Button>
						)}

						{currentPage < currentTotalPages - 1 && (
							<>
								{currentPage < currentTotalPages - 2 && (
									<span className="px-2 text-sm text-neutral-400">...</span>
								)}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onPageChange(currentTotalPages)}
									disabled={loading}
								>
									{currentTotalPages}
								</Button>
							</>
						)}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(currentPage + 1)}
						disabled={!hasNext || loading}
						aria-label="Next page"
					>
						Next
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
