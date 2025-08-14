import { useEffect, useState } from "react";
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

	useEffect(() => {
		log.debug("status", status);
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
								+${summary.totalIncome.toFixed(2)}
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
								-${summary.totalExpenses.toFixed(2)}
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
								{summary.netAmount >= 0 ? "+" : ""}$
								{summary.netAmount.toFixed(2)}
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
			<Card className="p-6">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-semibold text-neutral-900">
						{editingTransaction ? "Edit Transaction" : "Create Transaction"}
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
