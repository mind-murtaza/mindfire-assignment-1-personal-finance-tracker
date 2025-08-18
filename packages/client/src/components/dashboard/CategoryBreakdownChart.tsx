import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { ChartOptions } from "chart.js";
import type { CategoryBreakdown } from "../../services/api/transactions";
import { formatCurrency } from "../../lib/utils/formatters";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryBreakdownChartProps {
	data: CategoryBreakdown[];
	isLoading?: boolean;
}

export default function CategoryBreakdownChart({
	data,
	isLoading,
}: CategoryBreakdownChartProps) {
	const chartData = useMemo(() => {
		console.log("🎨 CategoryBreakdownChart received data:", data);
		
		if (!data || data.length === 0) {
			return {
				labels: ["No data available"],
				datasets: [
					{
						data: [1],
						backgroundColor: ["#e2e8f0"],
						borderColor: ["#e2e8f0"],
						borderWidth: 1,
					},
				],
			};
		}

		// Filter only expenses for spending breakdown and sort by total amount descending
		const expenseData = data
			.filter((item) => item.type === "expense")
			.sort((a, b) => b.total - a.total)
			.slice(0, 6);

		console.log("🎨 Filtered expense data for chart:", expenseData);

		if (expenseData.length === 0) {
			return {
				labels: ["No expense data"],
				datasets: [
					{
						data: [1],
						backgroundColor: ["#e2e8f0"],
						borderColor: ["#e2e8f0"],
						borderWidth: 1,
					},
				],
			};
		}

		return {
			labels: expenseData.map((item) => item.categoryName),
			datasets: [
				{
					data: expenseData.map((item) => item.total),
					backgroundColor: expenseData.map(
						(item) => item.categoryColor || "#6366f1"
					),
					borderColor: "#ffffff",
					borderWidth: 2,
					hoverBorderWidth: 3,
				},
			],
		};
	}, [data]);

	const options: ChartOptions<"doughnut"> = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "bottom" as const,
					labels: {
						padding: 16,
						usePointStyle: true,
						font: {
							size: 12,
							family:
								'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, Arial',
						},
						color: "#475569", // neutral-600
					},
				},
				tooltip: {
					backgroundColor: "#1f2937", // gray-800
					titleColor: "#ffffff",
					bodyColor: "#ffffff",
					borderColor: "#374151",
					borderWidth: 1,
					cornerRadius: 8,
					padding: 12,
					callbacks: {
						label: function (context) {
							const value = context.parsed;
							const total = context.dataset.data.reduce(
								(a: number, b: number) => a + b,
								0
							);
							const percentage = ((value / total) * 100).toFixed(1);
							return `${context.label}: ${formatCurrency(
								value
							)} (${percentage}%)`;
						},
					},
				},
			},
			cutout: "60%",
			elements: {
				arc: {
					borderJoinStyle: "round" as const,
				},
			},
		}),
		[]
	);

	if (isLoading) {
		return (
			<div className="h-64 flex items-center justify-center">
				<div className="animate-pulse">
					<div className="w-48 h-48 bg-neutral-200 rounded-full"></div>
				</div>
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className="h-64 flex flex-col items-center justify-center text-neutral-500">
				<div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
					<div className="w-8 h-8 bg-neutral-200 rounded-full"></div>
				</div>
				<p className="text-sm font-medium">No spending data available</p>
				<p className="text-xs text-neutral-400 mt-1">
					Add some transactions to see the breakdown
				</p>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="h-64">
				<Doughnut
					data={chartData}
					options={options}
					aria-label="Category spending breakdown chart"
					role="img"
				/>
			</div>

			{/* Center text showing total */}
			<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
				<span className="text-xs text-neutral-500 font-medium">
					Total Spent
				</span>
				<span className="text-lg font-semibold text-neutral-900">
					{formatCurrency(
						data
							.filter((item) => item.type === "expense")
							.reduce((sum, item) => sum + item.total, 0)
					)}
				</span>
			</div>

			{/* Screen reader accessible data table */}
			<div className="sr-only">
				<table>
					<caption>Category spending breakdown</caption>
					<thead>
						<tr>
							<th>Category</th>
							<th>Amount</th>
							<th>Transactions</th>
						</tr>
					</thead>
					<tbody>
						{data
							.filter((item) => item.type === "expense")
							.map((item) => (
								<tr key={item.categoryId}>
									<td>{item.categoryName}</td>
									<td>{formatCurrency(item.total)}</td>
									<td>{item.count}</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
