import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTransactions } from "../store/transactionSlice";
import type { Transaction } from "../services/api/transactions";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TransactionList from "../components/transactions/TransactionList";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionPagination from "../components/transactions/TransactionPagination";
import TransactionFilters from "../components/transactions/TransactionFilters";
import { createLogger } from "../lib/logger";
import { formatAmount } from "../lib/utils/formatters";
import { 
	useTransactionFilters, 
	useTransactionPagination, 
	useTransactionMutations,
	type TransactionCreateInput,
	type TransactionUpdateInput
} from "../features/transactions";

const log = createLogger("TransactionsPage");

export default function TransactionsPage() {
	const dispatch = useAppDispatch();
	const { byId, allIds, status, summary } = useAppSelector((s) => s.transactions);
	const items = allIds.map((id) => byId[id]);
	
	// Use feature hooks for cleaner separation of concerns
	const transactionFilters = useTransactionFilters();
	const transactionPagination = useTransactionPagination();
	const transactionMutations = useTransactionMutations();
	
	const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
	
	const transactionFormRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		log.info("status", status);
		if (status === "idle") {
			dispatch(fetchTransactions({}));
		}
	}, [dispatch, status]);

	// Transaction handlers using feature hooks
	const onCreate = async (data: TransactionCreateInput) => {
		await transactionMutations.createTransaction(data);
	};

	const onEditSubmit = async (data: TransactionUpdateInput) => {
		if (!editingTransaction) return;
		
		const result = await transactionMutations.updateTransaction(editingTransaction._id, data);
		if (result.success) {
			setEditingTransaction(null);
		}
	};

	function onEdit(transaction: Transaction) {
		setEditingTransaction(transaction);
		transactionMutations.clearMessage();
		
		setTimeout(() => {
			if (transactionFormRef.current) {
				const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				
				transactionFormRef.current.scrollIntoView({ 
					behavior: prefersReducedMotion ? 'auto' : 'smooth', 
					block: 'start',
					inline: 'nearest'
				});
				
				const formHeading = transactionFormRef.current.querySelector('#transaction-form-title');
				if (formHeading instanceof HTMLElement) {
					formHeading.focus();
				}
			}
		}, 100);
	}

	function cancelEdit() {
		setEditingTransaction(null);
		transactionMutations.clearMessage();
	}

	const onDelete = async (id: string) => {
		const transaction = byId[id];
		await transactionMutations.deleteTransaction(id, transaction?.description);
	};

	return (
		<div className="container py-8 space-y-6">
			{/* Status Message */}
			{transactionMutations.message && (
				<div
					className={`rounded-md border p-3 shadow-sm border-${transactionMutations.messageType}-200 bg-${transactionMutations.messageType}-50 text-${transactionMutations.messageType}-600`}
					role="status"
					aria-live="polite"
				>
					{transactionMutations.message}
				</div>
			)}

			{/* Financial Summary */}
			{summary && (
				<Card className="p-6">
					<h2 className="text-xl font-semibold text-neutral-900 mb-4">
						Financial Overview
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="text-center">
							<p className="text-sm font-medium text-neutral-600">
								Total Income
							</p>
							<p className="text-2xl font-bold text-success-600">
								{formatAmount(summary.totalIncome, "income")}
							</p>
							<p className="text-xs text-neutral-500">
								{summary.incomeCount} transactions
							</p>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-neutral-600">
								Total Expenses
							</p>
							<p className="text-2xl font-bold text-error-600">
								{formatAmount(summary.totalExpenses, "expense")}
							</p>
							<p className="text-xs text-neutral-500">
								{summary.expenseCount} transactions
							</p>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-neutral-600">Net Amount</p>
							<p
								className={`text-2xl font-bold ${
									summary.netAmount >= 0
										? "text-success-600"
										: "text-error-600"
								}`}
							>
								{formatAmount(summary.netAmount, summary.netAmount >= 0 ? "income" : "expense")}
							</p>
							<p className="text-xs text-neutral-500">
								{summary.incomeCount + summary.expenseCount} total
							</p>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-neutral-600">
								Last 7 Days
							</p>
							<p className="text-lg font-medium text-neutral-900">
								{items.length} transactions
							</p>
							<p className="text-xs text-neutral-500">Recent activity</p>
						</div>
					</div>
				</Card>
			)}

			<Card 
				ref={transactionFormRef} 
				className={`p-6 motion-safe:transition-colors motion-safe:duration-300 ${
					editingTransaction ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/30' : ''
				}`}
			>
				<div className="flex items-center justify-between mb-6">
					<h2 
						id="transaction-form-title" 
						className="text-xl font-semibold text-neutral-900"
						tabIndex={-1}
						aria-live="polite"
					>
						{editingTransaction ? (
							<span className="flex items-center gap-2">
								<span className="inline-block w-2 h-2 bg-blue-500 rounded-full motion-safe:animate-pulse" aria-hidden="true" />
								Edit Transaction
							</span>
						) : (
							"Create Transaction"
						)}
					</h2>
					{editingTransaction && (
						<Button
							onClick={cancelEdit}
							variant="outline"
						>
							Cancel Edit
						</Button>
					)}
				</div>
				
				{editingTransaction ? (
					<TransactionForm
						onSubmit={(data) => onEditSubmit(data as TransactionUpdateInput)}
						initial={{
							categoryId: editingTransaction.categoryId._id,
							amount: Number(editingTransaction.amount.$numberDecimal),
							type: editingTransaction.type,
							description: editingTransaction.description,
							notes: editingTransaction.notes || "",
							transactionDate: new Date(editingTransaction.transactionDate),
							tags: editingTransaction.tags || [],
						}}
						isEditing={true}
						busy={status === "loading"}
					/>
				) : (
					<TransactionForm
						onSubmit={(data) => onCreate(data as TransactionCreateInput)}
						busy={status === "loading"}
					/>
				)}
			</Card>

			{/* Filters */}
			<TransactionFilters
				filters={transactionFilters.filters}
				onFiltersChange={transactionFilters.onFiltersChange}
				onClearFilters={transactionFilters.onClearFilters}
				loading={transactionFilters.isLoading}
			/>

			{/* Transactions List */}
			<Card className="p-6 relative">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-neutral-900">
						Your Transactions
					</h2>
					<div className="text-sm text-neutral-600">
						{transactionPagination.total > 0 && `${transactionPagination.total} total transactions`}
					</div>
				</div>
				<TransactionList
					items={items}
					onEdit={onEdit}
					onDelete={onDelete}
					loading={transactionPagination.isLoading}
				/>
			</Card>

			{/* Pagination */}
			{transactionPagination.total > 0 && (
				<Card className="p-0">
					<TransactionPagination
						pagination={transactionPagination.pagination}
						total={transactionPagination.total}
						onPageChange={transactionPagination.onPageChange}
						onLimitChange={transactionPagination.onLimitChange}
						loading={transactionPagination.isLoading}
					/>
				</Card>
			)}

			{/* Load More Button (alternative to pagination) */}
			{transactionPagination.pagination.hasNext && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						onClick={transactionPagination.onLoadMore}
						disabled={transactionPagination.isLoading}
						className="px-8"
					>
						{transactionPagination.isLoading ? "Loading..." : "Load More Transactions"}
					</Button>
				</div>
			)}
		</div>
	);
}
