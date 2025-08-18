import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "../../services/api/transactions";
import {
	formatAmount,
	formatDate,
	getTransactionTypeColors,
} from "../../lib/utils/formatters";
import { ICONS } from "../../lib/utils/icons";

interface RecentTransactionsListProps {
	transactions: Transaction[];
	isLoading?: boolean;
}

export default function RecentTransactionsList({
	transactions,
	isLoading,
}: RecentTransactionsListProps) {
	if (isLoading) {
		return (
			<div className="space-y-3">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="animate-pulse flex items-center gap-3 p-3 rounded-lg border border-neutral-200"
					>
						<div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
						<div className="flex-1 space-y-2">
							<div className="h-4 bg-neutral-200 rounded w-32"></div>
							<div className="h-3 bg-neutral-200 rounded w-24"></div>
						</div>
						<div className="text-right space-y-2">
							<div className="h-4 bg-neutral-200 rounded w-16"></div>
							<div className="h-3 bg-neutral-200 rounded w-12"></div>
						</div>
					</div>
				))}
			</div>
		);
	}

	if (!transactions || transactions.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<ArrowUpRight className="w-8 h-8 text-neutral-400" />
				</div>
				<p className="text-sm font-medium text-neutral-500">
					No recent transactions
				</p>
				<p className="text-xs text-neutral-400 mt-1">
					<Link
						to="/transactions?action=add"
						className="text-primary-600 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-sm"
					>
						Add your first transaction
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			{transactions.map((transaction) => {
				const colors = getTransactionTypeColors(transaction.type);
				const IconComponent =
					ICONS[transaction.categoryId.icon as keyof typeof ICONS] || ICONS.tag;
				const TransactionIcon =
					transaction.type === "income" ? ArrowUpRight : ArrowDownLeft;

				return (
					<div
						key={transaction._id}
						className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
					>
						{/* Category Icon */}
						<div
							className={`relative w-10 h-10 rounded-full flex items-center justify-center ${colors.bg}`}
							style={{ backgroundColor: transaction.categoryId.color + "20" }}
						>
							<IconComponent
								className="w-5 h-5"
								style={{ color: transaction.categoryId.color }}
								aria-hidden="true"
							/>
							<div
								className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${colors.bg} border border-white`}
							>
								<TransactionIcon
									className={`w-2.5 h-2.5 ${colors.text}`}
									aria-hidden="true"
								/>
							</div>
						</div>

						{/* Transaction Details */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium text-neutral-900 truncate">
									{transaction.description}
								</p>
								<span className="text-xs text-neutral-500 flex-shrink-0">
									{transaction.categoryId.name}
								</span>
							</div>
							<div className="flex items-center gap-2 mt-1">
								<time
									className="text-xs text-neutral-500"
									dateTime={transaction.transactionDate}
								>
									{formatDate(transaction.transactionDate, "short")}
								</time>
								{transaction.tags && transaction.tags.length > 0 && (
									<div className="flex gap-1">
										{transaction.tags.slice(0, 2).map((tag) => (
											<span
												key={tag}
												className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600"
											>
												{tag}
											</span>
										))}
										{transaction.tags.length > 2 && (
											<span className="text-xs text-neutral-400">
												+{transaction.tags.length - 2}
											</span>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Amount */}
						<div className="text-right">
							<p className={`text-sm font-semibold ${colors.text}`}>
								{formatAmount(
									Number(transaction.amount.$numberDecimal),
									transaction.type
								)}
							</p>
						</div>
					</div>
				);
			})}

			{/* View All Link */}
			<div className="pt-3 border-t border-neutral-100 mt-4">
				<Link
					to="/transactions"
					className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-sm py-2"
				>
					View all transactions
				</Link>
			</div>
		</div>
	);
}
