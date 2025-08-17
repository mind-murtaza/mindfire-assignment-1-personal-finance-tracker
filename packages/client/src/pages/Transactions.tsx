import { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	fetchTransactions,
	createTransactionThunk,
	updateTransactionThunk,
	deleteTransactionThunk,
} from "../store/transactionSlice";
import type { Transaction } from "../services/api/transactions";
import type { TransactionCreateInput, TransactionUpdateInput } from "../lib/validation/transaction";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TransactionList from "../components/transactions/TransactionList";
import TransactionForm from "../components/transactions/TransactionForm";
import { createLogger } from "../lib/logger";
import { formatAmount } from "../lib/utils/formatters";

const log = createLogger("TransactionsPage");

export default function TransactionsPage() {
	const dispatch = useAppDispatch();
	const { byId, allIds, status, total, summary } = useAppSelector(
		(s) => {
			return s.transactions;
		}
	);
	const items = allIds.map((id) => byId[id]);
	const [message, setMessage] = useState<string | null>(null);
	const [messageType, setMessageType] = useState<
		"success" | "warning" | "error" | "info" | null
	>(null);
	const [editingTransaction, setEditingTransaction] =
		useState<Transaction | null>(null);
	
	const transactionFormRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		log.info("status", status);
		if (status === "idle") {
			dispatch(fetchTransactions({}));
		}
	}, [dispatch, status]);

	// Create transaction handler
	async function onCreate(data: TransactionCreateInput) {
		setMessage(null);
		const result = await dispatch(createTransactionThunk(data));
		
		if (createTransactionThunk.fulfilled.match(result)) {
			setMessage("Transaction created successfully");
			setMessageType("success");
		} else {
			setMessage("Failed to create transaction");
			setMessageType("error");
		}
	}

	// Edit transaction handler
	async function onEditSubmit(data: TransactionUpdateInput) {
		if (!editingTransaction) return;
		
		setMessage(null);
		const result = await dispatch(updateTransactionThunk({ 
			id: editingTransaction._id, 
			payload: data 
		}));
		
		if (updateTransactionThunk.fulfilled.match(result)) {
			setMessage("Transaction updated successfully");
			setMessageType("success");
			setEditingTransaction(null);
		} else {
			setMessage("Failed to update transaction");
			setMessageType("error");
		}
	}

	function onEdit(transaction: Transaction) {
		setEditingTransaction(transaction);
		setMessage(null);
		
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
		setMessage(null);
	}

	async function onDelete(id: string) {
		const transaction = byId[id];
		const name = transaction?.description ?? "this transaction";
		const ok = window.confirm(
			`Are you sure you want to delete "${name}"? This action cannot be undone.`
		);
		if (!ok) return;

		const res = await dispatch(deleteTransactionThunk(id));
		if (deleteTransactionThunk.fulfilled.match(res)) {
			setMessage("Transaction deleted successfully");
			setMessageType("info");
		} else {
			setMessage("Failed to delete transaction");
			setMessageType("error");
		}
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Status Message */}
			{message && (
				<div
					className={`rounded-md border p-3 shadow-sm border-${messageType}-200 bg-${messageType}-50 text-${messageType}-600`}
					role="status"
					aria-live="polite"
				>
					{message}
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

			{/* Transactions List */}
			<Card className="p-6 relative">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-neutral-900">
						Your Transactions
					</h2>
					<div className="text-sm text-neutral-600">
						{total > 0 && `${total} total transactions`}
					</div>
				</div>
				<TransactionList
					items={items}
					onEdit={onEdit}
					onDelete={onDelete}
					loading={status === "loading"}
				/>
			</Card>

			{/* Pagination Placeholder */}
			{total > 20 && (
				<Card className="p-4">
					<div className="flex justify-center">
						<div className="p-4 rounded-md border-2 border-dashed border-neutral-200 text-center">
							<p className="text-neutral-600">Pagination controls coming soon</p>
							<p className="text-sm text-neutral-500">
								Showing {items.length} of {total} transactions
							</p>
						</div>
					</div>
				</Card>
			)}
		</div>
	);
}
