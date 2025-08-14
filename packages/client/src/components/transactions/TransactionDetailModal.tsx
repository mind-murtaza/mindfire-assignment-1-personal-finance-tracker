import {
	X,
	Calendar,
	Tag as TagIcon,
	FileText,
	StickyNote,
	Clock,
} from "lucide-react";
import type { Transaction } from "../../services/api/transactions";
import { getIcon } from "../../lib/utils/icons";
import { formatAmount, formatDate } from "../../lib/utils/formatters";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface Props {
	transaction: Transaction | null;
	isOpen: boolean;
	onClose: () => void;
}

export default function TransactionDetailModal({
	transaction,
	isOpen,
	onClose,
}: Props) {
	if (!isOpen || !transaction) return null;

	const CategoryIcon = getIcon(transaction.categoryId.icon);



	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-modal-backdrop">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto z-modal">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-neutral-200">
					<h2 className="text-xl font-semibold text-neutral-900">
						Transaction Details
					</h2>
					<Button
						variant="outline"
						onClick={onClose}
						className="p-2"
						aria-label="Close modal"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Amount & Type */}
					<Card className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-neutral-600">Amount</p>
								<p
									className={`text-2xl font-bold ${
										transaction.type === "income"
											? "text-success-600"
											: "text-error-600"
									}`}
								>
									{formatAmount(Number(transaction.amount.$numberDecimal), transaction.type)}
								</p>
							</div>
							<div className="text-right">
								<p className="text-sm font-medium text-neutral-600">Type</p>
								<span
									className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
										transaction.type === "income"
											? "bg-success-50 text-success-600 border border-success-200"
											: "bg-error-50 text-error-600 border border-error-200"
									}`}
								>
									{transaction.type}
								</span>
							</div>
						</div>
					</Card>

					{/* Category */}
					<div>
						<label className="block text-sm font-medium text-neutral-700 mb-2">
							Category
						</label>
						<div className="flex items-center gap-3 p-3 rounded-md border border-neutral-200 bg-neutral-50">
							<span
								className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200"
								style={{ backgroundColor: transaction.categoryId.color }}
							/>
							<CategoryIcon className="h-5 w-5 text-neutral-600" />
							<span className="font-medium text-neutral-900">
								{transaction.categoryId.name}
							</span>
						</div>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-neutral-700 mb-2">
							<FileText className="inline h-4 w-4 mr-1" />
							Description
						</label>
						<div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
							<p className="text-neutral-900">{transaction.description}</p>
						</div>
					</div>

					{/* Notes */}
					{transaction.notes && (
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								<StickyNote className="inline h-4 w-4 mr-1" />
								Notes
							</label>
							<div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
								<p className="text-neutral-900 whitespace-pre-wrap">
									{transaction.notes}
								</p>
							</div>
						</div>
					)}

					{/* Transaction Date */}
					<div>
						<label className="block text-sm font-medium text-neutral-700 mb-2">
							<Calendar className="inline h-4 w-4 mr-1" />
							Transaction Date
						</label>
						<div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
							<p className="text-neutral-900">
								{formatDate(transaction.transactionDate, "long")}
							</p>
						</div>
					</div>

					{/* Tags */}
					{transaction.tags && transaction.tags.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								<TagIcon className="inline h-4 w-4 mr-1" />
								Tags
							</label>
							<div className="flex flex-wrap gap-2">
								{transaction.tags.map((tag, index) => (
									<span
										key={index}
										className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-50 text-primary-600 border border-primary-200"
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Timestamps */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								<Clock className="inline h-4 w-4 mr-1" />
								Created At
							</label>
							<div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
								<p className="text-sm text-neutral-600">
									{formatDate(transaction.createdAt, "long")}
								</p>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								<Clock className="inline h-4 w-4 mr-1" />
								Updated At
							</label>
							<div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
								<p className="text-sm text-neutral-600">
									{formatDate(transaction.updatedAt, "long")}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-3 p-6 border-t border-neutral-200">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
