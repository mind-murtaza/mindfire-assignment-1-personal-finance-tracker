import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { formatCurrency } from "../../lib/utils/formatters";
import { useMonthlySummaries } from "../../features/transactions/hooks/useMonthlySummaries";

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend
);

interface MonthData {
	month: string;
	year: number;
	monthNum: number;
	income: number;
	expenses: number;
	net: number;
}

export default function MonthlyTrendsChart() {
	const { data: monthlyData, isLoading, isError } = useMonthlySummaries(6);

	const chartData = useMemo(() => {
		const dataForChart: MonthData[] = monthlyData.map((month) => ({
			month: month.label,
			year: month.year,
			monthNum: month.month,
			income: month.summary?.income.total || 0,
			expenses: month.summary?.expenses.total || 0,
			net: month.summary?.netAmount || 0,
		}));

		return {
			labels: dataForChart.map((d) => d.month),
			datasets: [
				{
					label: "Income",
					data: dataForChart.map((d) => d.income),
					backgroundColor: "#10b981", // success-500
					borderColor: "#059669", // success-600
					borderWidth: 1,
					borderRadius: 4,
				},
				{
					label: "Expenses",
					data: dataForChart.map((d) => d.expenses),
					backgroundColor: "#ef4444", // error-500
					borderColor: "#dc2626", // error-600
					borderWidth: 1,
					borderRadius: 4,
				},
			],
		};
	}, [monthlyData]);

	const options: ChartOptions<"bar"> = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index" as const,
				intersect: false,
			},
			plugins: {
				legend: {
					position: "top" as const,
					align: "end" as const,
					labels: {
						usePointStyle: true,
						padding: 20,
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
							return `${context.dataset.label}: ${formatCurrency(
								context.parsed.y
							)}`;
						},
					},
				},
			},
			scales: {
				x: {
					grid: {
						display: false,
					},
					ticks: {
						color: "#64748b", // neutral-500
						font: {
							size: 11,
						},
					},
				},
				y: {
					beginAtZero: true,
					grid: {
						color: "#f1f5f9", // neutral-100
					},
					ticks: {
						color: "#64748b", // neutral-500
						font: {
							size: 11,
						},
						callback: function (value) {
							return formatCurrency(value as number);
						},
					},
				},
			},
		}),
		[]
	);

	if (isLoading) {
		return (
			<div className="h-64 flex items-center justify-center">
				<div className="animate-pulse flex space-x-2">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="flex flex-col items-center space-y-1">
							<div
								className="w-8 bg-neutral-200 rounded"
								style={{ height: `${20 + i * 10}px` }}
							></div>
							<div
								className="w-8 bg-neutral-200 rounded"
								style={{ height: `${15 + i * 8}px` }}
							></div>
							<div className="w-8 h-3 bg-neutral-200 rounded"></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="h-64 flex flex-col items-center justify-center text-neutral-500">
				<p className="text-sm font-medium">Failed to load trends data</p>
				<p className="text-xs text-neutral-400 mt-1">Please try again later</p>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="h-64">
				<Bar
					data={chartData}
					options={options}
					aria-label="Monthly income and expenses trends chart"
					role="img"
				/>
			</div>

			{/* Screen reader accessible data table */}
			<div className="sr-only">
				<table>
					<caption>Monthly income and expenses for the last 6 months</caption>
					<thead>
						<tr>
							<th>Month</th>
							<th>Income</th>
							<th>Expenses</th>
							<th>Net Amount</th>
						</tr>
					</thead>
					<tbody>
						{monthlyData.map((month) => {
							return (
								<tr key={`${month.year}-${month.month}`}>
									<td>{month.label}</td>
									<td>{formatCurrency(month.summary?.income.total || 0)}</td>
									<td>{formatCurrency(month.summary?.expenses.total || 0)}</td>
									<td>{formatCurrency(month.summary?.netAmount || 0)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
