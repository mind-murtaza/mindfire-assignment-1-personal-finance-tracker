import { useState } from "react";
import { Eye, Edit, Trash2 } from "lucide-react";
import type { Transaction } from "../../services/api/transactions";
import { getIcon } from "../../lib/utils/icons";
import { formatAmount, formatDate, getTransactionTypeColors } from "../../lib/utils/formatters";
import Button from "../ui/Button";
import TransactionDetailModal from "./TransactionDetailModal";

interface Props {
	items: Transaction[];
	onEdit: (transaction: Transaction) => void;
	onDelete: (id: string) => void;
	loading?: boolean;
}

export default function TransactionList({
	items,
	onEdit,
	onDelete,
	loading = false,
}: Props) {
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	const handleView = (transaction: Transaction) => {
		setSelectedTransaction(transaction);
		setIsDetailModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsDetailModalOpen(false);
		setSelectedTransaction(null);
	};

	if (loading) {
		return (
			<div className="rounded-md border border-info-200 bg-info-50 text-info-600 p-4 text-center">
				Loading transactions...
			</div>
		);
	}

	if (!items.length) {
		return (
			<div className="rounded-md border border-info-200 bg-info-50 text-info-600 p-4 text-center">
				No transactions found. Create your first transaction above.
			</div>
		);
	}

	return (
		<>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-neutral-600 border-b border-neutral-200">
							<th className="py-3 pr-4 font-medium">Category</th>
							<th className="py-3 pr-4 font-medium">Description</th>
							<th className="py-3 pr-4 font-medium">Amount</th>
							<th className="py-3 pr-4 font-medium">Type</th>
							<th className="py-3 pr-4 font-medium">Date</th>
							<th className="py-3 pr-4 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody className="align-top">
											{items.map((transaction, index) => {
						const CategoryIcon = getIcon(transaction.categoryId.icon);
						const typeColors = getTransactionTypeColors(transaction.type);
						return (
								<tr
									key={transaction._id}
									className={`border-t border-neutral-200 ${
										index % 2 === 0 ? "bg-neutral-50" : ""
									}`}
								>
									{/* Category */}
									<td className="py-3 pr-4">
										<div className="flex items-center gap-2 pl-2">
											<span
												className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-neutral-200"
												style={{
													backgroundColor: transaction.categoryId.color,
												}}
											/>
											<CategoryIcon className="h-4 w-4 text-neutral-600" />
											<span className="font-medium text-neutral-900 truncate max-w-[120px]">
												{transaction.categoryId.name}
											</span>
										</div>
									</td>

									{/* Description */}
									<td className="py-3 pr-4">
										<span className="text-neutral-900 truncate max-w-[150px] block">
											{transaction.description}
										</span>
									</td>

									{/* Amount */}
									<td className="py-3 pr-4">
										<span className={`font-medium ${typeColors.text} whitespace-nowrap`}>
											{formatAmount(
												Number(transaction.amount.$numberDecimal), 
												transaction.type
											)}
										</span>
									</td>

									{/* Type */}
									<td className="py-3 pr-4">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeColors.bg} ${typeColors.text} border ${typeColors.border}`}
										>
											{transaction.type}
										</span>
									</td>

									{/* Date */}
									<td className="py-3 pr-4">
										<span className="text-neutral-600 whitespace-nowrap">
											{formatDate(transaction.transactionDate, "table")}
										</span>
									</td>

									{/* Actions */}
									<td className="py-3 pr-4">
										<div className="flex gap-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleView(transaction)}
												className="p-1.5"
												title="View details"
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => onEdit(transaction)}
												className="p-1.5"
												aria-label={`Edit transaction: ${transaction.description}`}
												title={`Edit transaction: ${transaction.description}`}
											>
												<Edit className="h-3.5 w-3.5" aria-hidden="true" />
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => onDelete(transaction._id)}
												className="p-1.5"
												title="Delete transaction"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Detail Modal */}
			<TransactionDetailModal
				transaction={selectedTransaction}
				isOpen={isDetailModalOpen}
				onClose={handleCloseModal}
			/>
		</>
	);
}
