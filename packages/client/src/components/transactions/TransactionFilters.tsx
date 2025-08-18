import { useState, useEffect } from "react";
import { Filter, X, Calendar } from "lucide-react";
import { useAppSelector } from "../../store/hooks";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";
import type { TransactionListQuery } from "../../lib/validation/transaction";
import type { CategoryType } from "../../lib/validation/common";
import { formatDateForInput } from "../../lib/utils/formatters";
import { serializeFiltersForRedux } from "../../lib/utils/filters";

interface Props {
	filters: Partial<TransactionListQuery>;
	onFiltersChange: (filters: Partial<TransactionListQuery>) => void;
	onClearFilters: () => void;
	loading?: boolean;
}

export default function TransactionFilters({
	filters,
	onFiltersChange,
	onClearFilters,
	loading = false,
}: Props) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [localFilters, setLocalFilters] = useState<Partial<TransactionListQuery>>(filters);
	
	// Get categories for the category filter
	const { byId: categoriesById, allIds: categoryIds } = useAppSelector(
		(s) => s.categories
	);
	const categories = categoryIds.map((id) => categoriesById[id]);

	// Update local filters when props change
	useEffect(() => {
		setLocalFilters(filters);
	}, [filters]);

	// Check if any filters are active
	const hasActiveFilters = Object.keys(filters).some(key => {
		const value = filters[key as keyof TransactionListQuery];
		return value !== undefined && value !== null && value !== "";
	});

	const handleLocalFilterChange = (key: keyof TransactionListQuery, value: string | number | Date | undefined) => {
		setLocalFilters(prev => ({ ...prev, [key]: value }));
	};

	const applyFilters = () => {
		// Use utility function to serialize filters for Redux
		const serializedFilters = serializeFiltersForRedux(localFilters);
		onFiltersChange(serializedFilters as Partial<TransactionListQuery>);
		setIsExpanded(false);
	};

	const resetLocalFilters = () => {
		setLocalFilters({});
	};

	const clearAllFilters = () => {
		setLocalFilters({});
		onClearFilters(); // This calls the parent's clear function directly
		setIsExpanded(false);
	};

	// Helper function to check if current filters match a date range
	const isDateRangeActive = (days: number): boolean => {
		if (!localFilters.startDate || !localFilters.endDate) return false;
		
		const now = new Date();
		const targetDaysAgo = new Date(now);
		targetDaysAgo.setDate(now.getDate() - days);
		
		// Convert both dates to start of day for comparison
		const startOfDay = (date: Date | string) => {
			const d = typeof date === 'string' ? new Date(date) : new Date(date);
			d.setHours(0, 0, 0, 0);
			return d;
		};
		
		const filterStart = startOfDay(localFilters.startDate);
		const filterEnd = startOfDay(localFilters.endDate);
		const expectedStart = startOfDay(targetDaysAgo);
		const expectedEnd = startOfDay(now);
		
		// Check if the dates match (within 1 day tolerance for timezone issues)
		const daysDiff = Math.abs(filterStart.getTime() - expectedStart.getTime()) / (1000 * 60 * 60 * 24);
		const endDaysDiff = Math.abs(filterEnd.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24);
		
		return daysDiff <= 1 && endDaysDiff <= 1;
	};

	// Helper function to check if a type filter should show as active
	const isTypeFilterActive = (type?: "income" | "expense"): boolean => {
		// For "All" button (type === undefined), check if no type is selected
		if (type === undefined) {
			return !localFilters.type;
		}
		
		// Check if the type matches
		return localFilters.type === type;
	};

	return (
		<Card className="p-4">
			{/* Filter Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<Filter className="w-4 h-4 text-neutral-600" />
					<h3 className="font-medium text-neutral-900">Filters</h3>
					{hasActiveFilters && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600 border border-primary-200">
							Active
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAllFilters}
							disabled={loading}
							className="text-neutral-600 hover:text-neutral-900"
						>
							<X className="w-4 h-4" />
							Clear All
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
						disabled={loading}
					>
						{isExpanded ? "Collapse" : "Expand"}
					</Button>
				</div>
			</div>

			{/* Quick Filters (Always Visible) */}
			<div className="flex flex-wrap gap-2 mb-4">
				{/* Type Filter */}
				<div className="flex gap-1">
					<Button
						variant={isTypeFilterActive(undefined) ? "primary" : "ghost"}
						size="sm"
						onClick={() => handleLocalFilterChange("type", undefined)}
						disabled={loading}
					>
						All
					</Button>
					<Button
						variant={isTypeFilterActive("income") ? "primary" : "ghost"}
						size="sm"
						onClick={() => handleLocalFilterChange("type", "income" as CategoryType)}
						disabled={loading}
					>
						Income
					</Button>
					<Button
						variant={isTypeFilterActive("expense") ? "primary" : "ghost"}
						size="sm"
						onClick={() => handleLocalFilterChange("type", "expense" as CategoryType)}
						disabled={loading}
					>
						Expenses
					</Button>
				</div>

				{/* Quick Date Ranges */}
				<div className="flex gap-1">
					<Button
						variant={isDateRangeActive(7) ? "primary" : "ghost"}
						size="sm"
						onClick={() => {
							const now = new Date();
							const sevenDaysAgo = new Date(now);
							sevenDaysAgo.setDate(now.getDate() - 7);
							handleLocalFilterChange("startDate", sevenDaysAgo);
							handleLocalFilterChange("endDate", now);
						}}
						disabled={loading}
					>
						Last 7 days
					</Button>
					<Button
						variant={isDateRangeActive(30) ? "primary" : "ghost"}
						size="sm"
						onClick={() => {
							const now = new Date();
							const thirtyDaysAgo = new Date(now);
							thirtyDaysAgo.setDate(now.getDate() - 30);
							handleLocalFilterChange("startDate", thirtyDaysAgo);
							handleLocalFilterChange("endDate", now);
						}}
						disabled={loading}
					>
						Last 30 days
					</Button>
				</div>

				{localFilters !== filters && (
					<Button variant="primary" size="sm" onClick={applyFilters} disabled={loading}>
						Apply Filters
					</Button>
				)}
			</div>

			{/* Expanded Filters */}
			{isExpanded && (
				<div className="space-y-4 pt-4 border-t border-neutral-200">

					{/* Date Range */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								Start Date
							</label>
							<div className="relative">
								<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
								<Input
									type="date"
									value={localFilters.startDate ? formatDateForInput(localFilters.startDate).split('T')[0] : ""}
									onChange={(e) => handleLocalFilterChange("startDate", e.target.value ? new Date(e.target.value) : undefined)}
									disabled={loading}
									className="pl-10"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								End Date
							</label>
							<div className="relative">
								<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
								<Input
									type="date"
									value={localFilters.endDate ? formatDateForInput(localFilters.endDate).split('T')[0] : ""}
									onChange={(e) => handleLocalFilterChange("endDate", e.target.value ? new Date(e.target.value) : undefined)}
									disabled={loading}
									className="pl-10"
								/>
							</div>
						</div>
					</div>

					{/* Category Filter */}
					<div>
						<label className="block text-sm font-medium text-neutral-700 mb-2">
							Category
						</label>
						<select
							value={localFilters.categoryId || ""}
							onChange={(e) => handleLocalFilterChange("categoryId", e.target.value || undefined)}
							disabled={loading}
							className="w-full px-3 py-2 border border-neutral-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
						>
							<option value="">All Categories</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name} ({category.type})
								</option>
							))}
						</select>
					</div>

					{/* Amount Range */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								Min Amount ($)
							</label>
							<Input
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								value={localFilters.minAmount || ""}
								onChange={(e) => handleLocalFilterChange("minAmount", e.target.value ? Number(e.target.value) : undefined)}
								disabled={loading}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								Max Amount ($)
							</label>
							<Input
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								value={localFilters.maxAmount || ""}
								onChange={(e) => handleLocalFilterChange("maxAmount", e.target.value ? Number(e.target.value) : undefined)}
								disabled={loading}
							/>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-2 pt-4">
						<Button variant="primary" onClick={applyFilters} disabled={loading}>
							Apply Filters
						</Button>
						<Button variant="outline" onClick={resetLocalFilters} disabled={loading}>
							Reset
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}
