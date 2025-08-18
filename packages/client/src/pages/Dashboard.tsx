import { useQuery } from "@tanstack/react-query";
import {
	TrendingUp,
	TrendingDown,
	IndianRupee,
	PieChart,
	Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
	getTransactionSummary,
	getCategoryBreakdown,
	listTransactions,
} from "../services/api/transactions";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import SummaryCard from "../components/dashboard/SummaryCard";
import CategoryBreakdownChart from "../components/dashboard/CategoryBreakdownChart";
import MonthlyTrendsChart from "../components/dashboard/MonthlyTrendsChart";
import RecentTransactionsList from "../components/dashboard/RecentTransactionsList";

export default function Dashboard() {
	// Current month data
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	// Fetch current month summary
	const {
		data: currentSummary,
		isLoading: summaryLoading,
		error: summaryError,
	} = useQuery({
		queryKey: ["transaction-summary", currentYear, currentMonth],
		queryFn: async () => {

			try {
				const result = await getTransactionSummary({
					year: currentYear,
					month: currentMonth,
				});
				return result;
			} catch (error) {
				console.error("❌ Summary error:", error);
				throw error;
			}
		},
	});

	// Fetch category breakdown for current month
	const { data: categoryBreakdown, isLoading: breakdownLoading } = useQuery({
		queryKey: ["category-breakdown", currentYear, currentMonth],
		queryFn: async () => {
			const startDate = new Date(currentYear, currentMonth - 1, 1);
			const endDate = new Date(currentYear, currentMonth, 0);
			
			try {
				const result = await getCategoryBreakdown({ startDate, endDate });
				return result;
			} catch (error) {
				console.error("❌ Breakdown error:", error);
				throw error;
			}
		},
	});

	// Fetch recent transactions (last 5)
	const { data: recentTransactions, isLoading: transactionsLoading } = useQuery(
		{
			queryKey: ["recent-transactions"],
			queryFn: async () => {

				try {
					const result = await listTransactions({ limit: 5, page: 1 });
					return result;
				} catch (error) {
					console.error("❌ Recent transactions error:", error);
					throw error;
				}
			},
		}
	);

	// Get previous month for comparison
	const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
	const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

	const { data: previousSummary } = useQuery({
		queryKey: ["transaction-summary", prevYear, prevMonth],
		queryFn: () => getTransactionSummary({ year: prevYear, month: prevMonth }),
	});

	// Calculate trends
	const incomeTrend =
		currentSummary && previousSummary
			? ((currentSummary.income.total - previousSummary.income.total) /
					previousSummary.income.total) *
			  100
			: 0;

	const expensesTrend =
		currentSummary && previousSummary
			? ((currentSummary.expenses.total - previousSummary.expenses.total) /
					previousSummary.expenses.total) *
			  100
			: 0;
	// Check if we have any data at all
	const hasAnyData =
		(currentSummary?.income.total || 0) > 0 ||
		(currentSummary?.expenses.total || 0) > 0 ||
		(recentTransactions?.transactions?.length || 0) > 0;

	
	if (summaryError) {

		return (
			<div className="container py-8">
				<div className="text-center">
					<h1 className="text-2xl font-semibold text-neutral-900 mb-4">
						Dashboard
					</h1>
					<p className="text-error-600">
						Failed to load dashboard data. Please try again.
					</p>
					<details className="mt-4 text-left text-sm">
						<summary className="cursor-pointer text-neutral-600">
							Error Details
						</summary>
						<pre className="mt-2 p-2 bg-neutral-100 rounded text-xs overflow-auto">
							{JSON.stringify(summaryError, null, 2)}
						</pre>
					</details>
				</div>
			</div>
		);
	}

	// Show empty state if no data and not loading
	if (!summaryLoading && !transactionsLoading && !hasAnyData) {
		return (
			<div className="container py-6 sm:py-8">
				<div className="text-center py-12 sm:py-16 px-4">
					<div className="w-12 h-12 sm:w-16 sm:h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<IndianRupee className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-400" />
					</div>
					<h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2">
						Welcome to Your Dashboard!
					</h1>
					<p className="text-sm sm:text-base text-neutral-600 mb-6 max-w-md mx-auto">
						You haven't added any transactions yet. Start tracking your finances
						by adding your first transaction.
					</p>
					<Link to="/transactions?action=add">
						<Button className="inline-flex items-center gap-2 w-full sm:w-auto">
							<Plus className="h-4 w-4" aria-hidden="true" />
							Add Your First Transaction
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="container py-6 sm:py-8">
			{/* Header */}
			<div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Dashboard</h1>
					<p className="text-sm text-neutral-600 mt-1 sm:text-base">
						Welcome back! Here's your financial overview for{" "}
						{currentSummary?.yearMonth || "this month"}.
					</p>
				</div>
				<div className="flex-shrink-0">
					<Link to="/transactions?action=add">
						<Button className="inline-flex items-center gap-2 w-full sm:w-auto">
							<Plus className="h-4 w-4" aria-hidden="true" />
							<span className="sm:inline">Add Transaction</span>
						</Button>
					</Link>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
				<SummaryCard
					title="Total Income"
					amount={currentSummary?.income.total || 0}
					trend={incomeTrend}
					type="income"
					count={currentSummary?.income.count || 0}
					isLoading={summaryLoading}
					icon={TrendingUp}
				/>
				<SummaryCard
					title="Total Expenses"
					amount={currentSummary?.expenses.total || 0}
					trend={expensesTrend}
					type="expense"
					count={currentSummary?.expenses.count || 0}
					isLoading={summaryLoading}
					icon={TrendingDown}
				/>
				<SummaryCard
					title="Net Amount"
					amount={currentSummary?.netAmount || 0}
					trend={0} // Net amount trend calculation can be added
					type={(currentSummary?.netAmount ?? 0) >= 0 ? "income" : "expense"}
					isLoading={summaryLoading}
					icon={IndianRupee}
				/>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
				{/* Category Breakdown Charts */}
				<Card className="p-4 sm:p-6">
					<div className="flex items-center gap-2 mb-4">
						<PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-error-600" aria-hidden="true" />
						<h2 className="text-base sm:text-lg font-semibold text-neutral-900">
							Spending by Category
						</h2>
					</div>
					<CategoryBreakdownChart
						data={categoryBreakdown || []}
						isLoading={breakdownLoading}
						type="expense"
						title="Total Spent"
					/>
				</Card>

				<Card className="p-4 sm:p-6">
					<div className="flex items-center gap-2 mb-4">
						<PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-success-600" aria-hidden="true" />
						<h2 className="text-base sm:text-lg font-semibold text-neutral-900">
							Earning by Category
						</h2>
					</div>
					<CategoryBreakdownChart
						data={categoryBreakdown || []}
						isLoading={breakdownLoading}
						type="income"
						title="Total Earned"
					/>
				</Card>
			</div>

			{/* Monthly Trends Chart */}
			<div className="mb-6 sm:mb-8">
				<Card className="p-4 sm:p-6">
					<h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4">
						Monthly Trends
					</h2>
					<MonthlyTrendsChart />
				</Card>
			</div>

			{/* Recent Transactions */}
			<Card className="p-4 sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-base sm:text-lg font-semibold text-neutral-900">
						Recent Transactions
					</h2>
					<Link
						to="/transactions"
						className="text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-sm"
					>
						View All
					</Link>
				</div>
				<RecentTransactionsList
					transactions={recentTransactions?.transactions || []}
					isLoading={transactionsLoading}
				/>
			</Card>
		</div>
	);
}
