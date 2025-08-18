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
	type: "income" | "expense";
	title: string;
}

export default function CategoryBreakdownChart({
	data,
	isLoading,
	type,
	title,
}: CategoryBreakdownChartProps) {
	const chartData = useMemo(() => {
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

		// Filter by type and sort by total amount descending
		const filteredData = data
			.filter((item) => item.type === type)
			.sort((a, b) => b.total - a.total)
			.slice(0, 6);

		if (filteredData.length === 0) {
			return {
				labels: [`No ${type} data`],
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

		const defaultColor = type === "income" ? "#10b981" : "#6366f1";

		return {
			labels: filteredData.map((item) => item.categoryName),
			datasets: [
				{
					data: filteredData.map((item) => item.total),
					backgroundColor: filteredData.map(
						(item) => item.categoryColor || defaultColor
					),
					borderColor: "#ffffff",
					borderWidth: 2,
					hoverBorderWidth: 3,
				},
			],
		};
	}, [data, type]);

	const options: ChartOptions<"doughnut"> = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "bottom" as const,
					labels: {
						padding: 12,
						usePointStyle: true,
						boxWidth: 12,
						font: {
							size: 11,
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
				<p className="text-sm font-medium">No {type === "expense" ? "spending" : "earning"} data available</p>
				<p className="text-xs text-neutral-400 mt-1">
					Add some {type} transactions to see the breakdown
				</p>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="min-h-64 md:min-h-72">
				<Doughnut
					data={chartData}
					options={options}
					aria-label="Category spending breakdown chart"
					role="img"
				/>
			</div>

			{/* Center text showing total - positioned absolutely over the chart */}
			<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center" style={{ top: '20%', height: '40%' }}>
				<span className="text-xs font-medium text-neutral-500 md:text-sm">
					{title}
				</span>
				<span className="mt-1 text-xl font-semibold text-neutral-900 md:text-2xl">
					{formatCurrency(
						data
							.filter((item) => item.type === type)
							.reduce((sum, item) => sum + item.total, 0)
					)}
				</span>
			</div>

			{/* Screen reader accessible data table */}
			<div className="sr-only">
				<table>
					<caption>Category {type} breakdown</caption>
					<thead>
						<tr>
							<th>Category</th>
							<th>Amount</th>
							<th>Transactions</th>
						</tr>
					</thead>
					<tbody>
						{data
							.filter((item) => item.type === type)
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
