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
			console.log("🔍 Fetching summary for:", {
				year: currentYear,
				month: currentMonth,
			});
			try {
				const result = await getTransactionSummary({
					year: currentYear,
					month: currentMonth,
				});
				console.log("📊 Summary result:", result);
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
			console.log("🔍 Fetching breakdown for date range:", {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				currentYear,
				currentMonth,
				startDateLocal: startDate.toLocaleDateString(),
				endDateLocal: endDate.toLocaleDateString(),
			});
			try {
				const result = await getCategoryBreakdown({ startDate, endDate });
				console.log("📈 Breakdown result:", result);
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
				console.log("🔍 Fetching recent transactions");
				try {
					const result = await listTransactions({ limit: 5, page: 1 });
					console.log("📝 Recent transactions result:", result);
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

	// Debug logging
	console.log("🎯 Dashboard state:", {
		currentSummary,
		categoryBreakdown,
		recentTransactions,
		summaryLoading,
		breakdownLoading,
		transactionsLoading,
		summaryError,
		currentYear,
		currentMonth,
	});

	// Check if we have any data at all
	const hasAnyData =
		(currentSummary?.income.total || 0) > 0 ||
		(currentSummary?.expenses.total || 0) > 0 ||
		(recentTransactions?.transactions?.length || 0) > 0;

	console.log("📊 Data status:", {
		hasAnyData,
		summaryData: currentSummary,
		transactionCount: recentTransactions?.transactions?.length || 0,
		breakdownCount: categoryBreakdown?.length || 0,
	});

	if (summaryError) {
		console.error("❌ Dashboard error:", summaryError);
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
			<div className="container py-8">
				<div className="text-center py-16">
					<div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<IndianRupee className="w-8 h-8 text-neutral-400" />
					</div>
					<h1 className="text-2xl font-semibold text-neutral-900 mb-2">
						Welcome to Your Dashboard!
					</h1>
					<p className="text-neutral-600 mb-6">
						You haven't added any transactions yet. Start tracking your finances
						by adding your first transaction.
					</p>
					<Link to="/transactions?action=add">
						<Button className="inline-flex items-center gap-2">
							<Plus className="h-4 w-4" aria-hidden="true" />
							Add Your First Transaction
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="container py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-semibold text-neutral-900">Dashboard</h1>
					<p className="text-neutral-600 mt-1">
						Welcome back! Here's your financial overview for{" "}
						{currentSummary?.yearMonth || "this month"}.
					</p>
				</div>
				<Link to="/transactions?action=add">
					<Button className="inline-flex items-center gap-2">
						<Plus className="h-4 w-4" aria-hidden="true" />
						Add Transaction
					</Button>
				</Link>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Category Breakdown Chart */}
				<Card className="p-6">
					<div className="flex items-center gap-2 mb-4">
						<PieChart className="h-5 w-5 text-primary-600" aria-hidden="true" />
						<h2 className="text-lg font-semibold text-neutral-900">
							Spending by Category
						</h2>
					</div>
					<CategoryBreakdownChart
						data={categoryBreakdown || []}
						isLoading={breakdownLoading}
					/>
				</Card>

				{/* Monthly Trends Chart */}
				<Card className="p-6">
					<h2 className="text-lg font-semibold text-neutral-900 mb-4">
						Monthly Trends
					</h2>
					<MonthlyTrendsChart />
				</Card>
			</div>

			{/* Recent Transactions */}
			<Card className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-neutral-900">
						Recent Transactions
					</h2>
					<Link
						to="/transactions"
						className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-sm"
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
